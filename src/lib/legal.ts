/**
 * Who runs the site. Fill these in before going live; they appear on the
 * privacy and terms pages. (Placeholders are shown in brackets until then.)
 */
export const OPERATOR = {
  name: process.env.NEXT_PUBLIC_OPERATOR_NAME || '[Denumirea firmei]',
  cui: process.env.NEXT_PUBLIC_OPERATOR_CUI || '[CUI]',
  address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS || '[Adresa sediului]',
  email: process.env.NEXT_PUBLIC_OPERATOR_EMAIL || '[email de contact]',
};
