// The English check for descriptions (addons.js looksEnglish): the owner's rule, descriptions always in English.
// Usage: node tests/english-test.js
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '../app/tv/js/addons.js'),'utf8');
const a = src.indexOf('const EN_WORDS'), b = src.indexOf('\n}\n', src.indexOf('export function looksEnglish')) + 3;
const looksEnglish = new Function(src.slice(a, b).replace('export ', '') + '; return looksEnglish;')();
const T = [
 [true, 'A young man returns to his hometown after the death of his father and finds that the family business is in trouble.'],
 [true, 'When a mysterious force threatens the world, a team of heroes must unite to stop it.'],
 [true, 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.'],
 [false, 'Un joven regresa a su pueblo natal tras la muerte de su padre y descubre que el negocio familiar está en problemas.'],
 [false, 'Un jeune homme retourne dans sa ville natale après la mort de son père et découvre que l\'entreprise familiale est en difficulté.'],
 [false, 'Ein junger Mann kehrt nach dem Tod seines Vaters in seine Heimatstadt zurück und stellt fest, dass das Familienunternehmen in Schwierigkeiten ist.'],
 [false, 'Ungur maður snýr aftur í heimabæ sinn eftir dauða föður síns og kemst að því að fjölskyldufyrirtækið er í vanda.'],
 [false, 'Un giovane torna nella sua città natale dopo la morte del padre e scopre che l\'azienda di famiglia è in difficoltà.'],
 [false, 'Молодой человек возвращается в родной город после смерти отца.'],
 [false, 'Een jonge man keert terug naar zijn geboortestad na de dood van zijn vader en ontdekt dat het familiebedrijf in de problemen zit.'],
 [false, 'Um jovem volta para sua cidade natal após a morte do pai e descobre que o negócio da família está em apuros.'],
 [true, ''], [true, 'Short bit'],
 // short text (under 8 words): other languages' little words, against English's
 [false, 'Le retour du roi et des hobbits.'], [false, 'Un hombre y su perro.'], [false, 'Der Mann und das Meer.'],
 [false, 'Het verhaal van een familie.'], [false, 'Ett år för familjen och vännerna.'],
 [true, 'Born to die.'], [true, 'A man and his dog.'], [true, 'The return of the king.'], [true, 'Two brothers, one van.'], [true, 'Los Angeles, 1947.'], [true, 'Robert De Niro stars.'], [true, 'Guillermo del Toro presents.'],
];
let bad = 0;
for (const [want, t] of T) { const got = looksEnglish(t); if (got !== want) { bad++; console.log('WRONG', want, t.slice(0, 60)); } }
console.log(`${T.length - bad} of ${T.length} right`); process.exit(bad ? 1 : 0);
