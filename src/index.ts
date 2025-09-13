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
    const path = parseSelector([])(selector)
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
        console.log(tryGettingItem(config)(path))
    }
}

const tryGettingItem = (on: z.infer<typeof Branch>) =>
    (path: string[]): Maybe<z.infer<typeof Item>> => {
        if (path.length <= 0) return undefined
        const name = path.at(0)!
        if (name === "") return undefined
        const cur = on.database[name]
        if (cur === undefined) return undefined
        if (path.length <= 1) return cur
        if (cur.type !== "category") return undefined
        return tryGettingItem(cur)(path.slice(1))
    }

const parseSelector = (acc: string[]) => (selector: string): typeof acc => {
    const trimmedSelector = selector.trim()
    if (trimmedSelector === "") return acc
    const splittedSelector =
        trimmedSelector
            .split(".")
            .map(part => part.trim())
    const newAcc = [...acc, splittedSelector.at(0)!]
    if (splittedSelector.length <= 1) return newAcc
    return parseSelector(newAcc)(splittedSelector.slice(1).join("."))
}

if (import.meta.main) main(Bun.argv.slice(2))