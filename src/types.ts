import { z } from "zod"

export interface LeafItem extends z.infer<typeof LeafItemZ> { }
export interface CategoryItem extends z.infer<typeof CategoryItemZ> { }
export interface Config extends z.infer<typeof ConfigZ> { }
export type Item = LeafItem | CategoryItem
export type Branch = Config | CategoryItem

export const LeafItemZ = z.object({
    type: z.union([z.literal("file"), z.literal("dir")]),
    src: z.string(),
    dist: z.string()
})

export const CategoryItemZ = z.object({
    type: z.literal("category"),
    prefix: z.string(),
    get database() {
        return z.record(z.string(), ItemZ)
    }
})

export const ConfigZ = z.object({
    get database() {
        return z.record(z.string(), ItemZ)
    }
})

export const ItemZ = z.union([LeafItemZ, CategoryItemZ])

export const BranchZ = z.union([ConfigZ, CategoryItemZ])