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
    const dbFile = Bun.file("./database.yaml")
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
        console.log(showLeafItem(db)(path)(item))
        return
    }
    console.log(showNonLeafItem(db)(path)(item))
}

const getItem = (on: Branch) => (path: string[]): Maybe<Item> =>
    getItemX<Item>(on)(_ => cur => cur)({} as Item)(path)

const getItemFullSrc = (on: Branch) => (path: string[]): Maybe<string> =>
    getItemX<string>(on)(acc => cur => {
        const src = getSrcOrPrefix(cur)
        return acc === "" ? src : `${acc}/${src}`
    })("")(path)

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
            return getItemX<T>(on)(accUpdater)(newAcc)(restPath)
        }

const getAllLeafs = (on: Branch): [path: string[], item: LeafItem][] => {
    const childs = Object.entries(on.database).map(child => [[child[0]], child[1]] as [string[], Item])
    const leafs = childs.filter(child => child[1].type !== "category") as [string[], LeafItem][]
    const nonLeafs = childs.filter(child => child[1].type === "category") as [string[], CategoryItem][]
    const leafsInNonLeafsNested = nonLeafs.map(nonLeaf => [nonLeaf[0], getAllLeafs(nonLeaf[1])]) as [string[], [string[], LeafItem][]][]
    const leafsInNonLeafs = leafsInNonLeafsNested.map(leafsInNonLeafNested => {
        const nonLeaf = leafsInNonLeafNested[0]
        const rawLeafs = leafsInNonLeafNested[1]
        const processedLeafs = rawLeafs.map(rawLeaf => [[...nonLeaf, ...rawLeaf[0]], rawLeaf[1]] as [string[], LeafItem])
        return processedLeafs
    }).flat()
    return [...leafs, ...leafsInNonLeafs]
}

const getSrcOrPrefix = (item: Item): string =>
    item.type === "category" ? item.prefix : item.src

const showLeafItem = (on: Branch) => (path: string[]) => (item: LeafItem): string => `
[Leaf Item]
type = ${item.type}
path = ${path}
fullSrc = ${getItemFullSrc(on)(path)}
`.trim()

const showNonLeafItem = (on: Branch) => (path: string[]) => (item: Branch) => `
[Non-Leaf Item]
path = ${path}
fullSrc = ${getItemFullSrc(on)(path)}
[[Leafs]]
${getAllLeafs(item).map(leaf => showLeafItem(on)([...path, ...leaf[0]])(leaf[1]))}
`.trim()

if (import.meta.main) main(Bun.argv.slice(2))