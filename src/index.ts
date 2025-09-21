import { Branch, CategoryItem, Item, LeafItem } from "./types"

type Maybe<T> = T | undefined

const main = (args: string[]) => {
    if (args.length !== 2 || args.at(0) !== "backup" && args.at(0) !== "restore") {
        console.log("Usage: configctl <backup|restore> <selector>")
        return
    }
    const subCmd = args.at(0)!
    const selector = args.at(1)!
    const path = selector.split(".").map(part => part.trim())
}

const getAllLeaf = (on: Branch): [path: string, item: LeafItem][] => {
    const childs = Object.entries(on.database)
    const leafs = childs.filter(child => child[1].type !== "category") as [string, LeafItem][]
    const nonLeafs = childs.filter(child => child[1].type === "category") as [string, CategoryItem][]
    const leafsInNonLeafs = nonLeafs.map(nonLeaf => [nonLeaf[0], getAllLeaf(nonLeaf[1])]) as []
    return 1 as unknown as [path: string, item: LeafItem][]
}

const getItem = (on: Branch) => (path: string[]): Maybe<Item> => {
    if (path.length < 1) return undefined
    const curPath = path.at(0)!
    const restPath = path.slice(1)
    const cur = on.database[curPath]
    if (cur === undefined) return undefined
    if (restPath.length <= 0) return cur
    if (cur.type !== "category") return undefined
    return getItem(cur)(restPath)
}