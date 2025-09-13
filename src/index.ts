import { z } from "zod"
import { Config, Item } from "./types"

type Maybe<T> = T | undefined

type main = (args: string[]) => Promise<void>
type tryGettingFullSrc = (on: z.infer<typeof Item>[]) =>
    (acc: string) => (path: string) => Maybe<string>
type tryGettingItemR = (on: z.infer<typeof Item>[]) =>
    (path: string) => Maybe<z.infer<typeof Item>>
type tryGettingItem = (on: z.infer<typeof Item>[]) =>
    (name: string) => Maybe<z.infer<typeof Item>>
type getSrcOrPrefix = (item: z.infer<typeof Item>) => string

type tryFetchingItem = <T>(on: z.infer<typeof Item>) =>
    (accUpdater: Maybe<(acc:)>)

const main: main = async (args) => {
    if (args.length !== 2
        || !["backup", "restore"].includes(args.at(0)!)
    ) {
        console.log("Usage: configctl backup|restore [[...]category.]category|name")
        return
    }
    const subCmd = args.at(0)!
    const path = args.at(1)!
    const configPath = "config.yaml"
    const configFile = Bun.file(configPath)
    const configContent = await configFile.text()
    const configYaml = Bun.YAML.parse(configContent) as unknown
    const maybeConfig = Config.safeParse(configYaml)
    if (!maybeConfig.success) {
        console.log("Config file misform!")
        console.log("details:")
        console.log(maybeConfig.error.message)
    } else {
        const config = maybeConfig.data
        console.log(tryGettingItemR(config.database)(path))
        console.log(tryGettingFullSrc(config.database)("")(path))
    }
}

const tryGettingFullSrc: tryGettingFullSrc = (on) => (acc) => (path) => {
    if (path.trim() === "") return undefined
    const pathSplited = path.split(".")
    const name = pathSplited.at(0)!
    if (name.trim() === "") return undefined
    const cur = tryGettingItem(on)(name)
    if (cur === undefined) return undefined
    const curSrc = getSrcOrPrefix(cur)
    const newAcc = acc.trim() === "" ? curSrc : `${acc}/${curSrc}`
    if (pathSplited.length <= 1) return newAcc
    if (cur.type !== "category") return undefined
    const restPath = pathSplited.slice(1).join(".")
    return tryGettingFullSrc(cur.database)(newAcc)(restPath)
}

const tryGettingItemR: tryGettingItemR = (on) => (path) => {
    if (path.trim() === "") return undefined
    const pathSplited = path.split(".")
    const name = pathSplited.at(0)!
    if (name.trim() === "") return undefined
    const cur = tryGettingItem(on)(name)
    if (cur === undefined) return undefined
    if (pathSplited.length <= 1) return cur
    if (cur.type !== "category") return undefined
    const restPath = pathSplited.slice(1).join(".")
    return tryGettingItemR(cur.database)(restPath)
}

const tryGettingItem: tryGettingItem = (on) => (name) =>
    on.filter(item => item.name === name).at(-1)

const getSrcOrPrefix: getSrcOrPrefix = (item) =>
    item.type === "category" ? item.prefix : item.src

if (import.meta.main) main(Bun.argv.slice(2))