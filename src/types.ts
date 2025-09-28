import { z } from "zod"

export interface LeafItemX extends LeafItem {
    name: string
    fullPath: string[]
    fullSrc: string
    fullDist: string
}

export interface CategoryItemX extends CategoryItem {
    name: string
    fullPath: string[]
    fullPrefix: string
    database: DatabaseX
}

export interface ConfigX extends Config {
    database: DatabaseX
}

export type ItemX = LeafItemX | CategoryItemX
export type BranchX = ConfigX | CategoryItemX
export type ItemLikeX = ItemX | ConfigX
export interface DatabaseX extends Record<string, ItemX> { }

export interface LeafItem extends z.infer<typeof LeafItemZ> { }
export interface CategoryItem extends z.infer<typeof CategoryItemZ> { }
export interface Config extends z.infer<typeof ConfigZ> { }
export type Item = LeafItem | CategoryItem
export type Branch = Config | CategoryItem
export type ItemLikeZ = Item | Config
export interface Database extends z.infer<typeof DatabaseZ> { }

export const LeafItemZ = z.object({
    type: z.union([z.literal("file"), z.literal("dir")]),
    src: z.string(),
    dist: z.string()
})

export const CategoryItemZ = z.object({
    type: z.literal("category"),
    prefix: z.string(),
    get database() {
        return DatabaseZ
    }
})

export const ConfigZ = z.object({
    get database() {
        return DatabaseZ
    }
})

export const ItemZ = z.union([LeafItemZ, CategoryItemZ])

export const BranchZ = z.union([ConfigZ, CategoryItemZ])

export const ItemLikeZ = z.union([ItemZ, ConfigZ])

export const DatabaseZ = z.record(z.string(), ItemZ)