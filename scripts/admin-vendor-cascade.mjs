// Bootstrap utility !important declarations must not defeat Tailwind's
// utility layer. Keep component/plugin overrides and all storefront CSS intact.
export default function adminVendorCascade() {
  return {
    postcssPlugin: 'playbeat-admin-vendor-cascade',
    Once(root) {
      root.walkRules(rule => {
        const file = rule.source?.input?.file || '';
        if (!/[\\/]admin[\\/](?:vendor|sb2)-scoped\.css$/.test(file)) return;
        const utility = /\.pbadmin\s+\.(?:[mp][trblxy]?-[0-5]|(?:min-|max-)?[wh]-(?:25|50|75|100|auto)|rounded(?:-[\w-]+)?|border(?:-[\w-]+)?|text-[\w-]+|bg-[\w-]+|font-[\w-]+|flex(?:-[\w-]+)?|overflow-[\w-]+|shadow(?:-[\w-]+)?|position-[\w-]+|align-[\w-]+|order-[\w-]+|d-[\w-]+)(?=[\s,:.>]|$)/;
        if (utility.test(rule.selector)) rule.walkDecls(decl => { decl.important = false; });
      });
    },
  };
}
