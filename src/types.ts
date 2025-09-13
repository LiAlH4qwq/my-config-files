import { z } from "zod"

export const LeafItem = z.object({
    type: z.union([z.literal("file"), z.literal("dir")]),
    src: z.string(),
    dist: z.string()
})

export const CategoryItem = z.object({
    type: z.literal("category"),
    prefix: z.string(),
    get database() {
        return z.record(z.string(), Item)
    }
})

export const Config = z.object({
    get database() {
        return z.record(z.string(), Item)
    }
})

export const Item = z.union([LeafItem, CategoryItem])

export const Branch = z.union([Config, CategoryItem])