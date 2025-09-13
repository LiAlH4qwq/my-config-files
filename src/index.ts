import { z } from "zod"
import { Config, Branch, Item } from "./types"

type Maybe<T> = T | undefined

const main = async (args: string[]): Promise<void> => {
    if (args.length !== 2
        || !["backup", "restore"].includes(args.at(0)!)
    ) {
        console.log("Usage: configctl backup|restore [[...]category.]category|name")
        return
    }
    const subCmd = args.at(0)!
    const selector = args.at(1)!
    const path = selector.split(".").map(part => part.trim())
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
        const src = tryGettingFullSrc(config)(path)
        const dist = tryGettingFullDist(config)(path)
        if (src === undefined) console.log("No such file or directory!")
        else if (subCmd === "backup") console.log(`rm -rf ${dist} && cp -r ${src} ${dist}`)
        else console.log(`rm -rf ${src} && cp -r ${dist} ${src}`)
    }
}

const tryGettingFullSrc = (on: z.infer<typeof Branch>) => (path: string[]) =>
    tryGettingItemX(concatSrcOrPrefix)("")(on)(path)

const tryGettingFullDist = (on: z.infer<typeof Branch>) => (path: string[]) => {
    const item = tryGettingItemX((_) => (cur) => cur)(on)(on)(path) as Maybe<z.infer<typeof Item>>
    if (item === undefined) return undefined
    const base = "./database"
    return item.type === "category" ? `${base}/${path.join("/")}` : `${base}/${path.slice(0, -1).join("/")}/${item.dist}`
}

const tryGettingItemX = <T>(accUpdater: (acc: T) => (cur: z.infer<typeof Item>) => T) =>
    (acc: T) => (on: z.infer<typeof Branch>) => (path: string[]): Maybe<T> => {
        if (path.length <= 0) return undefined
        const name = path.at(0)!
        if (name === "") return undefined
        const cur = on.database[name]
        if (cur === undefined) return undefined
        const newAcc = accUpdater(acc)(cur)
        if (path.length <= 1) return newAcc
        if (cur.type !== "category") return undefined
        return tryGettingItemX(accUpdater)(newAcc)(cur)(path.slice(1))
    }

const concatSrcOrPrefix = (acc: string) => (cur: z.infer<typeof Item>) => {
    const curPath = getSrcOrPrefix(cur)
    return acc === "" ? curPath : `${acc}/${curPath}`
}

const getSrcOrPrefix = (item: z.infer<typeof Item>) =>
    item.type === "category" ? item.prefix : item.src

if (import.meta.main) main(Bun.argv.slice(2))