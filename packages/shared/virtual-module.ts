import { existsSync, promises as fs } from 'fs'
import type { LayerName, WindiPluginUtils } from '@windicss/plugin-utils'
import type { Plugin } from 'rollup'

export const MODULE_IDS = [/^virtual:windi(.*?)\.css/, /^windi(.*?)\.css/]
export const MODULE_ID_VIRTUAL_PREFIX = '/@windicss/windi'
export const MODULE_ID_VIRTUAL = /\/\@windicss\/windi-?(.*?)\.css/
export const MODULE_ID_VIRTUAL_MODULES = [
  `${MODULE_ID_VIRTUAL_PREFIX}.css`,
  `${MODULE_ID_VIRTUAL_PREFIX}-base.css`,
  `${MODULE_ID_VIRTUAL_PREFIX}-utilities.css`,
  `${MODULE_ID_VIRTUAL_PREFIX}-components.css`,
]

export function createVirtualModuleLoader(ctx: { utils: WindiPluginUtils }): Pick<Plugin, 'resolveId' | 'load' | 'watchChange'> {
  return {
    resolveId(id) {
      for (const idRegex of MODULE_IDS) {
        const match = id.match(idRegex)
        if (match)
          return `${MODULE_ID_VIRTUAL_PREFIX}${match[1]}.css`
      }
      return null
    },

    async load(id) {
      const match = id.match(MODULE_ID_VIRTUAL)
      if (match) {
        await ctx.utils.scan()
        await ctx.utils.waitLocks()
        ctx.utils.files.map(id => this.addWatchFile(id))

        const layer = (match[1] as LayerName | undefined) || undefined
        const css = await ctx.utils.generateCSS(layer)
        return css
      }
    },

    async watchChange(id, change) {
      if (change.event === 'delete' || !existsSync(id))
        return
      if (!ctx.utils.isDetectTarget(id))
        return
      ctx.utils.lock(async() => {
        const content = await fs.readFile(id, 'utf-8')
        await ctx.utils.extractFile(content, id, true)
      })
    },
  }
}
