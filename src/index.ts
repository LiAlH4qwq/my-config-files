import { lstat } from "fs/promises";
import { Branch, BranchX, CategoryItem, CategoryItemX, Config, ConfigZ, Item, ItemLikeX, ItemX, ItemZ, LeafItem, LeafItemX } from "./types"
import { ZodSafeParseResult } from "zod";

type Maybe<T> = T | undefined

type OPs = "list" | "backup" | "restore"

const main = async (args: string[]) => {
    if (args.length !== 2
        || args.at(0) !== "list"
        && args.at(0) !== "backup"
        && args.at(0) !== "restore"
    ) {
        console.log("Usage: configctl <list|backup|restore> <selector|*>")
        return
    }
    const subCmd = args.at(0) as OPs
    const selector = args.at(1)!
    const path = selector.trim() === "*" ?
        [] : selector.split(".").map(part => part.trim())
    const dbMaybe = await tryGetDb()
    if (!dbMaybe.success) {
        console.log(`Database file misform:\n${dbMaybe.error}`)
        return
    }
    const db = dbMaybe.data
    const enrichedDB = enrichBranch("")([])(db)
    const item = getItemX(enrichedDB)(path)(0)
    if (item === undefined) {
        console.log("Item not found!")
        return
    }
    console.log(opOnItemLikeX(item)(subCmd))
}

const tryGetDb = async (): Promise<ZodSafeParseResult<Config>> => {
    const dbFile = Bun.file("./db.yaml")
    const dbYaml = await dbFile.text()
    const dbObj = Bun.YAML.parse(dbYaml)
    return ConfigZ.safeParse(dbObj)
}

const enrichBranch = (prefix: string) => (path: string[]) =>
    (branch: Branch): BranchX => {
        const childEntries = Object.entries(branch.database)
            .map(child => ({ name: child[0], body: child[1] }))
        const directLeafEntries = childEntries
            .filter(entry => entry.body.type !== "category") as { name: string, body: LeafItem }[]
        const enrichedDirectLeafEntries = directLeafEntries
            .map(entry => ({
                ...entry,
                body: {
                    ...entry.body,
                    name: entry.name,
                    fullPath: [...path, entry.name],
                    fullSrc: prefix !== "" ? `${prefix}/${entry.body.src}` : entry.body.src,
                    fullDist: path.length >= 1 ? `./database/${path.join("/")}/${entry.body.dist}` : `./database/${entry.body.dist}`,
                },
            })) // as {name: string, body: LeafItemX}[]
        const nonLeafEntries = childEntries
            .filter(entry => entry.body.type === "category") as { name: string, body: CategoryItem }[]
        const enrichedNonLeafEntries = nonLeafEntries
            .map(entry => ({
                ...entry,
                body: enrichBranch(prefix !== "" ? `${prefix}/${entry.body.prefix}` : entry.body.prefix)([...path, entry.name])(entry.body) as CategoryItemX
            } as const)) // as {name: string, body: CategoryItemX}[]
        const enrichedChildEntries = [
            ...enrichedDirectLeafEntries,
            ...enrichedNonLeafEntries,
        ]
        const enrichedDadabase = Object.fromEntries(
            enrichedChildEntries.map(entry => [entry.name, entry.body] as const)
        )
        if (path.length <= 0)
            return {
                ...branch,
                database: enrichedDadabase,
            }
        return {
            ...branch,
            name: path.at(-1)!,
            fullPath: path,
            fullPrefix: prefix,
            database: enrichedDadabase,
        }
    }

const getItemX = (on: Maybe<ItemLikeX>) =>
    (path: string[]) => (offset: number): Maybe<ItemLikeX> => {
        // Try finding on undefined => undefined
        if (on === undefined) return undefined
        // No further path query => current item
        if (offset >= path.length) return on
        // Futher query exist but current item is leaf => undefined
        if (!("database" in on)) return undefined
        return getItemX(on.database[path.at(offset)!])(path)(offset + 1)
    }

const getAllLeafXs = (on: BranchX): LeafItemX[] => {
    const childs = Object.values(on.database)
    const directLeafs = childs
        .filter(child => child.type !== "category")
    const nonLeafs = childs
        .filter(child => child.type === "category")
    const leafsInNonLeafs = nonLeafs
        .flatMap(nonLeaf => getAllLeafXs(nonLeaf))
    return [...directLeafs, ...leafsInNonLeafs]
}

const showLeafItemX = (item: LeafItemX): string => `
[Leaf Item]
Name = ${item.name}
FullPath = ${item.fullPath.join(".")}
Type = ${item.type}
Src = ${item.src}
FullSrc = ${item.fullSrc}
Dist = ${item.dist}
FullDist = ${item.fullDist}
`.trim()

const showNonLeafX = (item: BranchX): string => {
    const leafs = getAllLeafXs(item)
        .map(showLeafItemX)
        .map(str => str
            .split("\n")
            .map(line => `  ${line}`)
            .join("\n")
            .replace("[Leaf Item]", "[[Leaf Item]]"))
        .join("\n")
    if (!("prefix" in item)) return `
[Non-Leaf Item (Root)]
${leafs}
    `.trim()
    return `
[Non-Leaf Item]
Name = ${item.name}
FullPath = ${item.fullPath.join(".")}
Type = ${item.type}
Prefix = ${item.prefix}
FullPrefix = ${item.fullPrefix}
${leafs}
    `.trim()
}

const opOnItemLikeX = (item: ItemLikeX) =>
    (op: OPs): string => {
        if (op === "list")
            return "src" in item ?
                showLeafItemX(item) :
                showNonLeafX(item)
        if (op === "backup")
            return "src" in item ?
                genCopyCmd(item.type === "dir")(item.fullSrc)(item.fullDist) :
                getAllLeafXs(item).map(leaf => genCopyCmd(leaf.type === "dir")(leaf.fullSrc)(leaf.fullDist)).join("\n")
        else
            return "src" in item ?
                genCopyCmd(item.type === "dir")(item.fullDist)(item.fullSrc) :
                getAllLeafXs(item).map(leaf => genCopyCmd(leaf.type === "dir")(leaf.fullDist)(leaf.fullSrc)).join("\n")
    }

const genCopyCmd = (isDir: boolean) => (src: string) => (dist: string): string => `
mkdir -p ${dist.split("/").slice(0, -1).join("/")}
rm${isDir ? " -r " : " "}${dist}
cp${isDir ? " -r " : " "}${src} ${dist}
`.trim()

if (import.meta.main) main(Bun.argv.slice(2))