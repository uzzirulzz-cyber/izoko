// Bootstrap utility !important declarations must not defeat Tailwind's
// utility layer. Keep component/plugin overrides and all storefront CSS intact.
export default function adminVendorCascade() {
  return {
    postcssPlugin: 'playbeat-admin-vendor-cascade',
    Once(root) {
      const file = root.source?.input?.file || '';
      const sbAdminV7 = /[\\/]admin[\\/]sb-admin-v7\.css$/.test(file);
      const legacyAdmin = /[\\/]admin[\\/](?:vendor|sb2)-scoped\.css$/.test(file);
      if (!sbAdminV7 && !legacyAdmin) return;

      // Keep the uploaded Bootstrap 5/SB Admin theme within this dashboard.
      if (sbAdminV7) {
        root.walkAtRules('charset', atRule => atRule.remove());
        root.walkRules(rule => {
          if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name || '')) return;
          rule.selectors = rule.selectors.map(selector => {
            const value = selector.trim();
            if (value.startsWith('.pbadmin .pa-dashboard')) return value;
            if (/^(?:html\s+body|html|body|:root)(?:\s|$|,)/.test(value)) return '.pbadmin .pa-dashboard';
            return '.pbadmin .pa-dashboard ' + value;
          });
        });
      }

      root.walkRules(rule => {
        const utility = /\.pbadmin(?:\s+\.pa-dashboard)?\s+\.(?:[mp][trblxy]?-[0-5]|(?:min-|max-)?[wh]-(?:25|50|75|100|auto)|rounded(?:-[\w-]+)?|border(?:-[\w-]+)?|text-[\w-]+|bg-[\w-]+|font-[\w-]+|flex(?:-[\w-]+)?|overflow-[\w-]+|shadow(?:-[\w-]+)?|position-[\w-]+|align-[\w-]+|order-[\w-]+|d-[\w-]+|gap-[0-5]|g[xy]?-[0-5])(?=[\s,:.>]|$)/;
        if (utility.test(rule.selector)) rule.walkDecls(decl => { decl.important = false; });
      });
    },
  };
}
