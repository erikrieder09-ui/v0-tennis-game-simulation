import type {
  AttributeSet,
  Backhand,
  Handedness,
  PlayStyle,
  Rival,
  Surface,
  Tour,
} from "./types"

/* -------------------------------------------------------------------------- */
/*  Deterministic PRNG (mulberry32) so the field is identical on every load    */
/* -------------------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* -------------------------------------------------------------------------- */
/*  Curated top players — parody names, realistic style / nation / physique    */
/* -------------------------------------------------------------------------- */

interface Seed {
  first: string
  last: string
  nat: string
  age: number
  hand: Handedness
  backhand: Backhand
  height: number
  weight: number
  style: PlayStyle
  favSurface: Surface
  ovr: number // target overall, drives the rest of the attributes
  injury: number
  currentAbility: number
  potentialAbility: number
}

const ATP_SEEDS: Seed[] = [
  { first: "Jannik", last: "Sinner", nat: "ITA", age: 24, hand: "right", backhand: "two", height: 191, weight: 77, style: "aggressive-baseline", favSurface: "hard", ovr: 96, injury: 22, currentAbility: 96, potentialAbility: 98 },
  { first: "Carlos", last: "Alcaraz", nat: "ESP", age: 23, hand: "right", backhand: "two", height: 183, weight: 74, style: "all-around", favSurface: "clay", ovr: 95, injury: 30, currentAbility: 95, potentialAbility: 98 },
  { first: "Alexander", last: "Zverev", nat: "GER", age: 28, hand: "right", backhand: "one", height: 198, weight: 90, style: "aggressive-baseline", favSurface: "hard", ovr: 90, injury: 40, currentAbility: 90, potentialAbility: 92 },
  { first: "Daniil", last: "Medvedev", nat: "RUS", age: 29, hand: "right", backhand: "two", height: 198, weight: 83, style: "defensive-baseline", favSurface: "hard", ovr: 89, injury: 25, currentAbility: 89, potentialAbility: 91 },
  { first: "Taylor", last: "Fritz", nat: "USA", age: 27, hand: "right", backhand: "two", height: 196, weight: 86, style: "aggressive-baseline", favSurface: "hard", ovr: 88, injury: 20, currentAbility: 88, potentialAbility: 90 },
  { first: "Novak", last: "Djokovic", nat: "SRB", age: 38, hand: "right", backhand: "two", height: 188, weight: 77, style: "all-around", favSurface: "hard", ovr: 89, injury: 35, currentAbility: 89, potentialAbility: 90 },
  { first: "Casper", last: "Ruud", nat: "NOR", age: 26, hand: "right", backhand: "two", height: 183, weight: 77, style: "defensive-baseline", favSurface: "clay", ovr: 83, injury: 18, currentAbility: 83, potentialAbility: 88 },
  { first: "Andrev", last: "Rublev", nat: "RUS", age: 28, hand: "right", backhand: "two", height: 188, weight: 75, style: "aggressive-baseline", favSurface: "hard", ovr: 85, injury: 28, currentAbility: 85, potentialAbility: 88 },
  { first: "Holger", last: "Rune", nat: "DEN", age: 22, hand: "right", backhand: "two", height: 188, weight: 77, style: "aggressive-baseline", favSurface: "hard", ovr: 85, injury: 32, currentAbility: 85, potentialAbility: 90 },
  { first: "Grigor", last: "Dimitrov", nat: "BUL", age: 34, hand: "right", backhand: "one", height: 191, weight: 80, style: "all-around", favSurface: "hard", ovr: 80, injury: 45, currentAbility: 80, potentialAbility: 86 },
  { first: "Stefan", last: "Tsitsipas", nat: "GRE", age: 27, hand: "right", backhand: "one", height: 193, weight: 89, style: "aggressive-baseline", favSurface: "clay", ovr: 81, injury: 30, currentAbility: 81, potentialAbility: 88 },
  { first: "Alex", last: "De Minaur", nat: "AUS", age: 27, hand: "right", backhand: "two", height: 183, weight: 69, style: "defensive-baseline", favSurface: "hard", ovr: 86, injury: 24, currentAbility: 86, potentialAbility: 86 },
  { first: "Tomas", last: "Machac", nat: "CZE", age: 25, hand: "right", backhand: "two", height: 188, weight: 80, style: "aggressive-baseline", favSurface: "hard", ovr: 81, injury: 20, currentAbility: 81, potentialAbility: 86 },
  { first: "Ben", last: "Shelton", nat: "USA", age: 23, hand: "left", backhand: "two", height: 193, weight: 88, style: "serve-volley", favSurface: "hard", ovr: 85, injury: 18, currentAbility: 85, potentialAbility: 88 },
  { first: "Lorenzo", last: "Mussetti", nat: "ITA", age: 23, hand: "right", backhand: "one", height: 185, weight: 78, style: "all-around", favSurface: "clay", ovr: 84, injury: 26, currentAbility: 84, potentialAbility: 88 },
  { first: "Hubert", last: "Hurkacz", nat: "POL", age: 30, hand: "right", backhand: "two", height: 196, weight: 86, style: "aggressive-baseline", favSurface: "hard", ovr: 80, injury: 22, currentAbility: 80, potentialAbility: 84 },
  { first: "France", last: "Tiafoe", nat: "USA", age: 27, hand: "right", backhand: "two", height: 188, weight: 80, style: "all-around", favSurface: "hard", ovr: 83, injury: 25, currentAbility: 83, potentialAbility: 84 },
  { first: "Felix", last: "Auger-Allisime", nat: "CAN", age: 25, hand: "right", backhand: "two", height: 193, weight: 88, style: "all-around", favSurface: "hard", ovr: 86, injury: 20, currentAbility: 86, potentialAbility: 90 },
  { first: "Flavio", last: "Cobolli", nat: "ITA", age: 24, hand: "right", backhand: "two", height: 183, weight: 74, style: "defensive-baseline", favSurface: "clay", ovr: 84, injury: 20, currentAbility: 84, potentialAbility: 88 },
  { first: "Alexander", last: "Bublik", nat: "KAZ", age: 28, hand: "right", backhand: "two", height: 196, weight: 82, style: "serve-volley", favSurface: "grass", ovr: 84, injury: 25, currentAbility: 84, potentialAbility: 89 },
  { first: "Jiri", last: "Lehecka", nat: "CZE", age: 24, hand: "right", backhand: "two", height: 185, weight: 81, style: "aggressive-baseline", favSurface: "hard", ovr: 81, injury: 25, currentAbility: 81, potentialAbility: 90 },
  { first: "Karen", last: "Kachanov", nat: "RUS", age: 30, hand: "right", backhand: "two", height: 198, weight: 87, style: "aggressive-baseline", favSurface: "hard", ovr: 84, injury: 20, currentAbility: 84, potentialAbility: 87 },
  { first: "Jakub", last: "Mensik", nat: "CZE", age: 20, hand: "right", backhand: "two", height: 193, weight: 83, style: "aggressive-baseline", favSurface: "hard", ovr: 84, injury: 20, currentAbility: 84, potentialAbility: 94 },
  { first: "Luciano", last: "Darderi", nat: "ITA", age: 24, hand: "right", backhand: "two", height: 183, weight: 82, style: "aggressive-baseline", favSurface: "hard", ovr: 81, injury: 25, currentAbility: 81, potentialAbility: 87 },
  { first: "Learner", last: "Tien", nat: "USA", age: 20, hand: "left", backhand: "two", height: 180, weight: 73, style: "defensive-baseline", favSurface: "hard", ovr: 82, injury: 20, currentAbility: 82, potentialAbility: 92 },
  { first: "Valentin", last: "Vacherot", nat: "MON", age: 27, hand: "right", backhand: "two", height: 193, weight: 85, style: "aggressive-baseline", favSurface: "hard", ovr: 82, injury: 25, currentAbility: 82, potentialAbility: 85 },
  { first: "Arthur", last: "Fils", nat: "FRA", age: 22, hand: "right", backhand: "two", height: 185, weight: 83, style: "aggressive-baseline", favSurface: "clay", ovr: 84, injury: 20, currentAbility: 84, potentialAbility: 93 },
  { first: "Alejandro", last: "Davidovich Fokina", nat: "ESP", age: 27, hand: "right", backhand: "two", height: 183, weight: 78, style: "all-around", favSurface: "clay", ovr: 82, injury: 25, currentAbility: 82, potentialAbility: 84 },
  { first: "Rafael", last: "Jodar", nat: "ESP", age: 19, hand: "right", backhand: "two", height: 191, weight: 80, style: "aggressive-baseline", favSurface: "clay", ovr: 80, injury: 20, currentAbility: 80, potentialAbility: 94 },
  { first: "Joao", last: "Fonseca", nat: "BRA", age: 19, hand: "right", backhand: "two", height: 185, weight: 73, style: "aggressive-baseline", favSurface: "clay", ovr: 81, injury: 20, currentAbility: 81, potentialAbility: 94 },
  { first: "Francisco", last: "Cerundolo", nat: "ARG", age: 27, hand: "right", backhand: "two", height: 185, weight: 80, style: "aggressive-baseline", favSurface: "clay", ovr: 83, injury: 25, currentAbility: 83, potentialAbility: 87 },
  { first: "Tommy", last: "Paul", nat: "USA", age: 29, hand: "right", backhand: "two", height: 185, weight: 82, style: "all-around", favSurface: "hard", ovr: 82, injury: 25, currentAbility: 82, potentialAbility: 85 },
  { first: "Stan", last: "Wawrinka", nat: "SWI", age: 40, hand: "right", backhand: "one", height: 183, weight: 81, style: "aggressive-baseline", favSurface: "clay", ovr: 78, injury: 30, currentAbility: 78, potentialAbility: 78 },
  { first: "Gael", last: "Monfils", nat: "Fra", age: 39, hand: "right", backhand: "two", height: 193, weight: 85, style: "all-around", favSurface: "hard", ovr: 76, injury: 30, currentAbility: 76, potentialAbility: 76 },
  { first: "Henrik", last: "Rydén", nat: "SWE", age: 21, hand: "left", backhand: "one", height: 187, weight: 80, style: "all-around", favSurface: "hard", ovr: 69, injury: 18, currentAbility: 69, potentialAbility: 94 },
  { first: "Luka", last: "Rinovic", nat: "CRO", age: 22, hand: "right", backhand: "two", height: 211, weight: 101, style: "serve-volley", favSurface: "grass", ovr: 68, injury: 30, currentAbility: 68, potentialAbility: 90 },
  { first: "Feliciano", last: "Tolosa", nat: "COL", age: 21, hand: "right", backhand: "two", height: 175, weight: 72, style: "defensive-baseline", favSurface: "clay", ovr: 68, injury: 18, currentAbility: 68, potentialAbility: 90 },
  { first: "Romain", last: "Lordian", nat: "FRA", age: 22, hand: "right", backhand: "two", height: 179, weight: 73, style: "defensive-baseline", favSurface: "hard", ovr: 68, injury: 20, currentAbility: 68, potentialAbility: 90 },
  { first: "Gustav", last: "Rydén", nat: "SWE", age: 23, hand: "right", backhand: "one", height: 186, weight: 79, style: "aggressive-baseline", favSurface: "hard", ovr: 68, injury: 22, currentAbility: 68, potentialAbility: 92 },
  { first: "Francis", last: "Botter", nat: "CAN", age: 24, hand: "right", backhand: "two", height: 185, weight: 82, style: "aggressive-baseline", favSurface: "hard", ovr: 68, injury: 24, currentAbility: 68, potentialAbility: 90 },
  { first: "Maksim", last: "Yianetskiy", nat: "RUS", age: 20, hand: "left", backhand: "two", height: 182, weight: 77, style: "defensive-baseline", favSurface: "clay", ovr: 68, injury: 18, currentAbility: 68, potentialAbility: 90 },
  { first: "Tiagu", last: "Gumu", nat: "MLT", age: 23, hand: "right", backhand: "two", height: 191, weight: 88, style: "serve-volley", favSurface: "hard", ovr: 68, injury: 20, currentAbility: 68, potentialAbility: 90 },
  { first: "Lemuph", last: "Le mer", nat: "FRA", age: 16, hand: "right", backhand: "two", height: 196, weight: 84, style: "aggressive-baseline", favSurface: "grass", ovr: 70, injury: 15, currentAbility: 70, potentialAbility: 98 },
]

const WTA_SEEDS: Seed[] = [
  { first: "Iga", last: "Swiatek", nat: "POL", age: 25, hand: "right", backhand: "two", height: 176, weight: 65, style: "all-around", favSurface: "clay", ovr: 94, injury: 18, currentAbility: 94, potentialAbility: 97 },
  { first: "Arina", last: "Sabalénka", nat: "KAZ", age: 27, hand: "right", backhand: "two", height: 182, weight: 80, style: "aggressive-baseline", favSurface: "hard", ovr: 94, injury: 24, currentAbility: 94, potentialAbility: 96 },
  { first: "Coco", last: "Gaff", nat: "USA", age: 21, hand: "right", backhand: "two", height: 175, weight: 62, style: "defensive-baseline", favSurface: "hard", ovr: 91, injury: 16, currentAbility: 91, potentialAbility: 97 },
  { first: "Elina", last: "Ribákina", nat: "KAZ", age: 26, hand: "right", backhand: "two", height: 184, weight: 72, style: "aggressive-baseline", favSurface: "grass", ovr: 89, injury: 22, currentAbility: 89, potentialAbility: 92 },
  { first: "Jésica", last: "Pegúla", nat: "USA", age: 31, hand: "right", backhand: "two", height: 170, weight: 65, style: "all-around", favSurface: "hard", ovr: 87, injury: 20, currentAbility: 87, potentialAbility: 88 },
  { first: "Jásmin", last: "Paolino", nat: "ITA", age: 29, hand: "right", backhand: "two", height: 163, weight: 58, style: "defensive-baseline", favSurface: "clay", ovr: 85, injury: 18, currentAbility: 85, potentialAbility: 88 },
  { first: "Kási", last: "Múchova", nat: "CZE", age: 29, hand: "right", backhand: "two", height: 180, weight: 65, style: "all-around", favSurface: "hard", ovr: 85, injury: 50, currentAbility: 85, potentialAbility: 88 },
  { first: "Zhéng", last: "Qinwén", nat: "CHN", age: 23, hand: "right", backhand: "two", height: 178, weight: 72, style: "aggressive-baseline", favSurface: "hard", ovr: 84, injury: 22, currentAbility: 84, potentialAbility: 92 },
  { first: "Mira", last: "Andréiova", nat: "RUS", age: 18, hand: "right", backhand: "two", height: 170, weight: 60, style: "all-around", favSurface: "hard", ovr: 84, injury: 16, currentAbility: 84, potentialAbility: 98 },
  { first: "Bárbora", last: "Krejcíkova", nat: "CZE", age: 30, hand: "right", backhand: "two", height: 178, weight: 66, style: "all-around", favSurface: "clay", ovr: 82, injury: 40, currentAbility: 82, potentialAbility: 84 },
  { first: "Danila", last: "Cólins", nat: "USA", age: 32, hand: "right", backhand: "two", height: 173, weight: 65, style: "aggressive-baseline", favSurface: "hard", ovr: 81, injury: 30, currentAbility: 81, potentialAbility: 84 },
  { first: "Emma", last: "Navárez", nat: "USA", age: 24, hand: "right", backhand: "two", height: 168, weight: 60, style: "defensive-baseline", favSurface: "clay", ovr: 81, injury: 18, currentAbility: 81, potentialAbility: 88 },
  { first: "Dária", last: "Kasátkova", nat: "AUS", age: 28, hand: "right", backhand: "two", height: 170, weight: 60, style: "defensive-baseline", favSurface: "clay", ovr: 80, injury: 22, currentAbility: 80, potentialAbility: 88 },
  { first: "Beatris", last: "Haddá Maya", nat: "BRA", age: 29, hand: "left", backhand: "two", height: 185, weight: 70, style: "aggressive-baseline", favSurface: "clay", ovr: 79, injury: 26, currentAbility: 79, potentialAbility: 88 },
  { first: "Ludmila", last: "Sámsonova", nat: "RUS", age: 27, hand: "right", backhand: "two", height: 184, weight: 72, style: "aggressive-baseline", favSurface: "hard", ovr: 79, injury: 24, currentAbility: 79, potentialAbility: 88 },
  { first: "Liudmila", last: "Fernándes", nat: "USA", age: 23, hand: "right", backhand: "two", height: 168, weight: 59, style: "all-around", favSurface: "hard", ovr: 78, injury: 20, currentAbility: 78, potentialAbility: 88 },
  { first: "Élise", last: "Mertons", nat: "BEL", age: 30, hand: "right", backhand: "two", height: 170, weight: 64, style: "all-around", favSurface: "hard", ovr: 78, injury: 18, currentAbility: 78, potentialAbility: 84 },
  { first: "Abiye", last: "Sancar", nat: "TUR", age: 22, hand: "right", backhand: "two", height: 164, weight: 58, style: "all-around", favSurface: "hard", ovr: 67, injury: 16, currentAbility: 67, potentialAbility: 95 },
  { first: "Anastasía", last: "Pávlukova", nat: "RUS", age: 28, hand: "right", backhand: "two", height: 175, weight: 64, style: "aggressive-baseline", favSurface: "hard", ovr: 77, injury: 26, currentAbility: 77, potentialAbility: 88 },
  { first: "Viktória", last: "Asaránka", nat: "BEL", age: 36, hand: "right", backhand: "two", height: 183, weight: 66, style: "aggressive-baseline", favSurface: "hard", ovr: 76, injury: 38, currentAbility: 76, potentialAbility: 80 },
]

/* -------------------------------------------------------------------------- */
/*  Name pools for procedurally generated lower-ranked players                 */
/* -------------------------------------------------------------------------- */

const NAT_NAMES: Record<string, { m: string[]; f: string[]; sur: string[] }> = {
  ESP: { m: ["Pablo", "Roberto", "Nicolás", "Bernabé", "Jaume"], f: ["Sara", "Núria", "Cristina", "Aliona"], sur: ["Carreras", "Bautísta", "Davídov", "Munár", "Taberné"] },
  ITA: { m: ["Mateo", "Flávio", "Luchiano", "Fabián", "Andreo"], f: ["Lúcia", "Martina", "Elisabeta"], sur: ["Cobóli", "Arnáldi", "Nárdi", "Sonegi", "Darderé"] },
  FRA: { m: ["Adrián", "Gael", "Corentín", "Arturo", "Benjamín"], f: ["Caroline", "Diane", "Océane"], sur: ["Monfís", "Pouilé", "Halís", "Bonzí", "Müller"] },
  USA: { m: ["Marcos", "Brandón", "Reilly", "Maxim", "Aleks"], f: ["Madison", "Sloane", "Peyton", "Ashlyn"], sur: ["Opeka", "Nákashima", "Kúdla", "Pánul", "Brooksbi"] },
  ARG: { m: ["Federico", "Tomás", "Sebastián", "Mariano", "Camilo"], f: ["Nadia", "Julia", "Solána"], sur: ["Báez", "Etcheverri", "Coméseña", "Díaz Acósta", "Navone"] },
  GER: { m: ["Jan", "Yannick", "Daniel", "Maximilian", "Oskar"], f: ["Tatjana", "Laura", "Eva"], sur: ["Hanfman", "Áltmaier", "Múterer", "Koepfer", "Marterer"] },
  RUS: { m: ["Roman", "Pável", "Aslán", "Yevgeni", "Mijaíl"], f: ["Anna", "Veronika", "Polína", "Kamíla"], sur: ["Safúllin", "Karatsév", "Kuznetsóv", "Donskói"] },
  AUS: { m: ["Rinky", "Aleksei", "James", "Jordan", "Chris"], f: ["Ajla", "Storm", "Olivia"], sur: ["Hijíkata", "Pópyrin", "Vukíc", "Kúbler", "Walton"] },
  GBR: { m: ["Jack", "Cameron", "Daniel", "Liam", "Billy"], f: ["Katie", "Harriet", "Jodie"], sur: ["Drappér", "Norié", "Evanson", "Brúce", "Fearnly"] },
  CZE: { m: ["Jiri", "Tomás", "Vit", "Dalibor", "Lukás"], f: ["Karolína", "Linda", "Tereza"], sur: ["Lehécka", "Kopríva", "Menshik", "Svrcína"] },
  CAN: { m: ["Gabriel", "Vasek", "Liam", "Alexis", "Steven"], f: ["Bianca", "Leylah", "Rebecca"], sur: ["Diallon", "Pospísil", "Galarneu"] },
  JPN: { m: ["Yoshihito", "Taro", "Sho", "Kaito", "Rei"], f: ["Naomi", "Misaki", "Mai"], sur: ["Nishíoka", "Daniélo", "Shimabúkuro", "Mochizúki"] },
  CHN: { m: ["Zhizhen", "Juncheng", "Yibing", "Bo", "Hao"], f: ["Shuai", "Xinyu", "Lin"], sur: ["Zhang", "Shang", "Wu", "Bu", "Sun"] },
  CHI: { m: ["Cristóbal", "Tomás", "Nicolás", "Alejandro"], f: ["Daniela", "Bárbara"], sur: ["Garín", "Tabilón", "Jarry", "Barríos"] },
  SRB: { m: ["Miomir", "Laslo", "Hamad", "Dusan", "Filip"], f: ["Olga", "Nina"], sur: ["Kecmánovic", "Djéré", "Medjedóvic", "Lájovic"] },
  GRE: { m: ["Petros", "Stefanos", "Aristotelis"], f: ["Maria", "Despina"], sur: ["Pervolárakis", "Sakellarídis"] },
  NED: { m: ["Tallon", "Botic", "Jesper", "Gijs"], f: ["Arantxa", "Suzan"], sur: ["Grikspóor", "Van der Zándel", "De Jongh"] },
  POL: { m: ["Hubert", "Kamil", "Maks", "Daniel"], f: ["Magda", "Maja", "Iga"], sur: ["Majcheck", "Walków", "Linette"] },
  KAZ: { m: ["Aleksandr", "Timofei", "Dmitri", "Beibit"], f: ["Yulia", "Anna", "Zarina"], sur: ["Búblik", "Skátov", "Putintsév", "Diyás"] },
  NOR: { m: ["Casper", "Viktor", "Lukas"], f: ["Malene", "Astrid"], sur: ["Durasóvic", "Lundberg"] },
  BUL: { m: ["Dimitar", "Adrian", "Pyotr"], f: ["Viktoria", "Isabella"], sur: ["Lazárov", "Andréev", "Kuzmánov"] },
  BRA: { m: ["Thiago", "Gustavo", "Felipe", "João"], f: ["Laura", "Carolina"], sur: ["Monteíro", "Seyboth", "Wildé", "Meligéni"] },
  CRO: { m: ["Borna", "Marin", "Dino", "Mate"], f: ["Petra", "Donna"], sur: ["Goyón", "Pricónic", "Serdarúsic"] },
  POR: { m: ["Nuno", "Henrique", "Joao"], f: ["Francisca", "Matilde"], sur: ["Borgues", "Faria", "Cabral"] },
  AUT: { m: ["Dominic", "Jurij", "Filip"], f: ["Julia", "Sinja"], sur: ["Rodionóv", "Misólic", "Ofner"] },
  BEL: { m: ["David", "Zizou", "Raphael"], f: ["Greet", "Yanina"], sur: ["Goffén", "Bergs", "Coppejáns"] },
  HUN: { m: ["Marton", "Fabian", "Zsombor"], f: ["Anna", "Dalma"], sur: ["Fucsóvics", "Marozsán", "Piros"] },
  MEX: { m: ["Rodrigo", "Ernesto", "Alex"], f: ["Renata", "Fernanda"], sur: ["Pacheco", "Escobedó", "Hernández"] },
  COL: { m: ["Daniel", "Nicolás", "Alejandro"], f: ["Emiliana", "Maria"], sur: ["Galán", "Mejía", "Barrientós"] },
  URU: { m: ["Franco", "Pablo", "Martín"], f: ["Guillermina"], sur: ["Roncadélli", "Cuevás"] },
}

const NAT_POOL = Object.keys(NAT_NAMES)
const STYLES: PlayStyle[] = ["aggressive-baseline", "defensive-baseline", "serve-volley", "all-around"]

/* -------------------------------------------------------------------------- */
/*  Build attribute set from a target overall + style profile                  */
/* -------------------------------------------------------------------------- */

function attrsFromOverall(ovr: number, style: PlayStyle, rand: () => number): AttributeSet {
  const bias: Record<PlayStyle, Partial<Record<keyof AttributeSet, number>>> = {
    "aggressive-baseline": { serve: 4, drive: 7, power: 7, backhand: 3, volley: -8, speed: -1, stamina: -3, return: 2, defense: -3 },
    "defensive-baseline":  { speed: 8, stamina: 8, backhand: 4, mentality: 3, serve: -6, power: -7, volley: -6, return: 6, defense: 8 },
    "serve-volley":        { serve: 9, volley: 9, power: 4, speed: 1, backhand: -7, stamina: -4, return: -5, defense: -4 },
    "all-around":          { serve: 1, drive: 1, backhand: 1, volley: 1, speed: 1, stamina: 1, power: 1, return: 1, defense: 1 },
  }
  const b = bias[style]
  const keys: (keyof AttributeSet)[] = ["serve", "drive", "backhand", "volley", "return", "defense", "speed", "stamina", "power", "mentality"]
  const out = {} as AttributeSet
  for (const k of keys) {
    const noise = Math.round((rand() - 0.5) * 8)
    const v = ovr + (b[k] ?? 0) + noise
    out[k as keyof AttributeSet] = Math.max(25, Math.min(99, v))
  }
  out.potential       = Math.round(50 + rand() * 30)
  out.professionalism = Math.round(40 + rand() * 40)
  out.durability      = Math.round(45 + rand() * 35)
  out.adaptability    = Math.round(45 + rand() * 35)
  return out
}

/** Fechas de retiro fijas para jugadores específicos (override del cálculo determinístico). */
const FIXED_RETIREMENTS: Record<string, string> = {
  "Wawrinka": endOfSeason(2026),
  "Monfils": endOfSeason(2026),
  "Djokovic": endOfSeason(2028),
}

function makeRival(seed: Seed, tour: Tour, rand: () => number, id: string): Rival {
  const retirementDate = FIXED_RETIREMENTS[seed.last] ?? computeRetirementDate(seed.age, rand)
  return {
    id,
    tour,
    firstName: seed.first,
    lastName: seed.last,
    nationality: seed.nat,
    age: seed.age,
    handedness: seed.hand,
    backhand: seed.backhand,
    height: seed.height,
    weight: seed.weight,
    playStyle: seed.style,
    attributes: attrsFromOverall(seed.currentAbility, seed.style, rand),
    overall: seed.currentAbility,
    rank: 0,
    points: 0,
    favSurface: seed.favSurface,
    injuryProneness: seed.injury,
    currentAbility: seed.currentAbility,
    potentialAbility: seed.potentialAbility,
    retirementDate,
  }
}

const SURFACES: Surface[] = ["hard", "clay", "grass"]

function generatedRival(tour: Tour, rank: number, rand: () => number, id: string): Rival {
  // Curva progresiva y realista:
  // Rank 19 → ~79, Rank 50 → ~73, Rank 100 → ~68, Rank 150 → ~63, Rank 200 → ~58, Rank 249 → ~54
  const base = 95 - Math.log(rank) * 5.8
  const ovr = Math.max(52, Math.min(79, Math.round(base + (rand() - 0.5) * 3)))  // Overall decays with rank: ~74 at #25 down to ~48 deep in Futures.

  const nat = NAT_POOL[Math.floor(rand() * NAT_POOL.length)]
  const names = NAT_NAMES[nat]
  const givenPool = tour === "WTA" ? names.f : names.m
  const first = givenPool[Math.floor(rand() * givenPool.length)]
  const last = names.sur[Math.floor(rand() * names.sur.length)]

  const style = STYLES[Math.floor(rand() * STYLES.length)]
  const hand: Handedness = rand() < 0.14 ? "left" : "right"
  const backhand: Backhand = rand() < (tour === "WTA" ? 0.04 : 0.12) ? "one" : "two"
  const age = 17 + Math.floor(rand() * 19) // 17-35
  const height = tour === "WTA" ? 162 + Math.floor(rand() * 24) : 175 + Math.floor(rand() * 24)
  const weight = Math.round((height - 100) * (tour === "WTA" ? 0.82 : 0.9) + (rand() - 0.5) * 8)
  const favSurface = SURFACES[Math.floor(rand() * SURFACES.length)]
  // Younger and older players are a bit more injury-prone; add noise.
  const injuryBase = 20 + Math.abs(age - 26) * 1.4 + (rand() * 30)
  const injuryProneness = Math.max(8, Math.min(85, Math.round(injuryBase)))

  return {
    id,
    tour,
    firstName: first,
    lastName: last,
    nationality: nat,
    age,
    handedness: hand,
    backhand,
    height,
    weight,
    playStyle: style,
    attributes: attrsFromOverall(ovr, style, rand),
    overall: ovr,
    rank,
    points: 0,
    favSurface,
    injuryProneness,
    currentAbility: ovr,
    potentialAbility: Math.min(99, ovr + Math.floor(rand() * 15)),
    retirementDate: computeRetirementDate(age, rand),
  }
}

function pointsForRank(rank: number): number {
  // Rough ATP/WTA-like points curve.
  if (rank === 1) return 11000
  if (rank <= 5) return Math.round(8500 - (rank - 1) * 900)
  if (rank <= 10) return Math.round(5200 - (rank - 5) * 250)
  if (rank <= 50) return Math.round(3600 - (rank - 10) * 60)
  if (rank <= 100) return Math.round(1200 - (rank - 50) * 12)
  if (rank <= 175) return Math.round(620 - (rank - 100) * 4)
  return Math.max(8, Math.round(320 - (rank - 175) * 2))
}

/* -------------------------------------------------------------------------- */
/*  Retirement                                                                  */
/* -------------------------------------------------------------------------- */

const SEASON_START = "2026-06-08"

/** Fecha (lunes) de fin de una temporada dada, usada como corte para retiros. */
function endOfSeason(year: number): string {
  // Aproximamos el fin de temporada (ATP Finals) a mediados de noviembre.
  return `${year}-11-16`
}

/**
 * Calcula la fecha de retiro determinística para un jugador según su edad actual
 * (al arrancar la carrera, SEASON_START) y un valor aleatorio determinístico (rand).
 * Jugadores más jóvenes tienen probabilidad ~0 de retirarse pronto; a partir de los
 * 33-34 la probabilidad de un retiro dentro de los próximos años crece.
 */
function computeRetirementDate(age: number, rand: () => number): string | null {
  if (age < 32) return null // muy joven para tener fecha de retiro fija todavía

  // Años de carrera restantes estimados: declina con la edad, con ruido.
  const baseYearsLeft = Math.max(0.5, 6 - (age - 32) * 0.8)
  const yearsLeft = Math.max(0.5, baseYearsLeft + (rand() - 0.5) * 2)

  const retireYear = 2026 + Math.round(yearsLeft)
  return endOfSeason(Math.min(2034, Math.max(2026, retireYear)))
}

/* -------------------------------------------------------------------------- */
/*  Public API: build a full 249-player ranking ladder for a given tour        */
/* -------------------------------------------------------------------------- */

const FIELD_SIZE = 249

function buildTour(tour: Tour): Rival[] {
  const seeds = tour === "ATP" ? ATP_SEEDS : WTA_SEEDS
  const rand = mulberry32(tour === "ATP" ? 0x5f3759 : 0x9e3779)
  const list: Rival[] = []

  seeds.forEach((s, i) => {
    list.push(makeRival(s, tour, rand, `${tour}-${i + 1}`))
  })

  for (let rank = seeds.length + 1; rank <= FIELD_SIZE; rank++) {
    list.push(generatedRival(tour, rank, rand, `${tour}-${rank}`))
  }

  // Sort by overall desc to assign coherent ranks & points.
  list.sort((a, b) => b.overall - a.overall || a.lastName.localeCompare(b.lastName))
  list.forEach((r, i) => {
    r.rank = i + 1
    r.points = pointsForRank(i + 1)
  })

  return list
}

let _cache: Partial<Record<Tour, Rival[]>> = {}

/**
 * Devuelve el roster completo (incluye jugadores ya retirados a la fecha dada).
 * Usar getRankings() para el roster activo filtrado por currentDate.
 */
function getFullRoster(tour: Tour): Rival[] {
  if (!_cache[tour]) _cache[tour] = buildTour(tour)
  return _cache[tour]!
}

/**
 * Ranking activo: excluye a los jugadores ya retirados a `currentDate`,
 * y rellena el campo con jugadores jóvenes generados para mantener FIELD_SIZE.
 */
export function getRankings(tour: Tour, currentDate: string = SEASON_START): Rival[] {
  const full = getFullRoster(tour)
  const active = full.filter(r => !r.retirementDate || r.retirementDate > currentDate)

  if (active.length >= FIELD_SIZE) {
    return active.slice(0, FIELD_SIZE)
  }

  // Generar reemplazos jóvenes determinísticos para completar el campo.
  const rand = mulberry32(tour === "ATP" ? 0x5f3759 ^ 0x1234 : 0x9e3779 ^ 0x1234)
  const replacements: Rival[] = []
  let nextRank = active.length + 1
  let genIndex = 0
  while (active.length + replacements.length < FIELD_SIZE) {
    const id = `${tour}-replacement-${genIndex}`
    const r = generatedRival(tour, nextRank, rand, id)
    // Jugadores de reemplazo entran jóvenes, como promesas nuevas.
    r.age = 17 + Math.floor(rand() * 4) // 17-20
    r.retirementDate = computeRetirementDate(r.age, rand)
    replacements.push(r)
    nextRank++
    genIndex++
  }

  const merged = [...active, ...replacements]
  merged.sort((a, b) => b.overall - a.overall || a.lastName.localeCompare(b.lastName))
  merged.forEach((r, i) => {
    r.rank = i + 1
    r.points = pointsForRank(i + 1)
  })

  return merged
}

export function divisionForRank(rank: number): import("./types").Division {
  if (rank <= 4) return "grand-slam"
  if (rank <= 50) return "masters"
  if (rank <= 110) return "tour"
  if (rank <= 200) return "challenger"
  return "futures"
}
