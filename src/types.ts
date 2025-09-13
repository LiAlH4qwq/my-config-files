import { z } from "zod"

export const fileItem = z.object({
    name: z.string(),
    type: z.literal("file"),
    src: z.string(),
    dist: z.string()
})

export const dirItem = z.object({
    name: z.string(),
    type: z.literal("dir"),
    src: z.string(),
    dist: z.string()
})

export const CategoryItem = z.object({
    name: z.string(),
    type: z.literal("category"),
    prefix: z.string(),
    get database() {
        return z.array(Item)
    }
})

export const Item = z.union([fileItem, dirItem, CategoryItem])

export const Config = z.object({
    get database() {
        return z.array(Item)
    }
})