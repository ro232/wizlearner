# Teste în browser

Verifică site-ul cum îl folosește un om: deschide fiecare pagină, dă click, descarcă PDF-urile,
pe telefon, tabletă și calculator, în motoarele Chrome, Safari și Firefox.

    npm run build
    npm run e2e                          # toate browserele
    npm run e2e -- --project=pc-chrome   # doar unul

Pe GitHub rulează singure la fiecare pull request (vezi .github/workflows/ci.yml).
