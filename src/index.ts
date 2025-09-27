import { lstat } from "fs/promises";
import { Branch, CategoryItem, ConfigZ, Item, LeafItem } from "./types"

type Maybe<T> = T | undefined

const main = async (args: string[]) => {
    if (args.length !== 2 || args.at(0) !== "backup" && args.at(0) !== "restore") {
        console.log("Usage: configctl <backup|restore> <selector>")
        return
    }
    const subCmd = args.at(0)!
    const selector = args.at(1)!
    const path = selector.split(".").map(part => part.trim())
    const dbFile = Bun.file("./db.yaml")
    const dbYaml = await dbFile.text()
    const dbObj = Bun.YAML.parse(dbYaml)
    const dbMaybe = ConfigZ.safeParse(dbObj)
    if (!dbMaybe.success) {
        console.log(`Database file misform:\n${dbMaybe.error}`)
        return
    }
    const db = dbMaybe.data
    const item = getItem(db)(path)
    if (item === undefined) {
        console.log("Item not found!")
        return
    }
    if (item.type !== "category") {
        console.log(genCopyCmd(item.type === "dir")(getItemFullSrc(db)(path)!)(getItemFullDist(db)(path)!))
        return
    }
    const leafs = getAllLeafs(item)
        .map(leaf => [leaf, getItem(item)(leaf) as LeafItem] as [string[], LeafItem])
    leafs.map(leaf => {
        const fullPath = [...path, ...leaf[0]]
        console.log(genCopyCmd(leaf[1].type === "dir")(getItemFullSrc(db)(fullPath)!)(getItemFullDist(db)(fullPath)!))
    })
}

const getItem = (on: Branch) => (path: string[]): Maybe<Item> =>
    getItemX<Item>(on)(_ => cur => cur)({} as Item)(path)

const getItemFullSrc = (on: Branch) => (path: string[]): Maybe<string> =>
    getItemX<string>(on)(acc => cur => {
        const src = getSrcOrPrefix(cur)
        return acc === "" ? src : `${acc}/${src}`
    })("")(path)

const getItemFullDist = (on: Branch) => (path: string[]): Maybe<string> =>
    `./database/${path.slice(0, -1).join("/")}/${getItemX<string>(on)(_ => cur => cur.type === "category" ? "" : cur.dist)("")(path)}`

const getItemX = <T>(on: Branch) =>
    (accUpdater: (acc: T) => (cur: Item) => T) =>
        (acc: T) => (path: string[]): Maybe<T> => {
            if (path.length <= 0) return undefined
            const curPath = path.at(0)!
            const restPath = path.slice(1)
            const cur = on.database[curPath]
            if (cur === undefined) return undefined
            const newAcc = accUpdater(acc)(cur)
            if (restPath.length <= 0) return newAcc
            if (cur.type !== "category") return undefined
            return getItemX<T>(cur)(accUpdater)(newAcc)(restPath)
        }

const getAllLeafs = (on: Branch): string[][] => {
    const childItems = Object.entries(on.database)
        .map(child => [[child[0]], child[1]] as [string[], Item])
    const directLeafs = childItems
        .filter(child => child[1].type !== "category")
        .map(child => child[0])
    const nonLeafItems = childItems
        .filter(child => child[1].type === "category") as [string[], CategoryItem][]
    const leafsInNonLeafsItemsNested = nonLeafItems
        .map(nonLeaf => [nonLeaf[0], getAllLeafs(nonLeaf[1])] as [string[], string[][]])
    const leafsInNonLeafs = leafsInNonLeafsItemsNested.map(leafsInNonLeafNested => {
        const nonLeaf = leafsInNonLeafNested[0]
        const rawLeafs = leafsInNonLeafNested[1]
        const processedLeafs = rawLeafs.map(rawLeaf => [...nonLeaf, ...rawLeaf])
        return processedLeafs
    }).flat()
    return [...directLeafs, ...leafsInNonLeafs]
}

const getSrcOrPrefix = (item: Item): string =>
    item.type === "category" ? item.prefix : item.src

const showLeafItem = (item: LeafItem) => `
[Leaf Item]
type = ${item.type}
src = ${item.src}
dist = ${item.dist}
`.trim()

const genCopyCmd = (isDir: boolean) => (src: string) => (dist: string): string => `
mkdir -p ${dist.split("/").slice(0, -1).join("/")}
rm${isDir ? " -r " : " "}${dist}
cp${isDir ? " -r " : " "}${src} ${dist}
`.trim()

if (import.meta.main) main(Bun.argv.slice(2))