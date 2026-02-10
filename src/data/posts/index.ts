import type { MapPost } from './types'
import { ancientPosts } from './ancient'
import { anubisPosts } from './anubis'
import { dust2Posts } from './dust2'
import { infernoPosts } from './inferno'
import { miragePosts } from './mirage'
import { nukePosts } from './nuke'
import { overpassPosts } from './overpass'

export type { MapPost }

export const posts: MapPost[] = [
  ...ancientPosts,
  ...anubisPosts,
  ...dust2Posts,
  ...infernoPosts,
  ...miragePosts,
  ...nukePosts,
  ...overpassPosts,
]
