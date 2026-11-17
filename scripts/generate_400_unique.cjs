const fs = require('fs');

const surnames = [
  "DELA CRUZ", "GARCIA", "REYES", "RAMOS", "MENDOZA", "SANTOS", "FLORES", "GONZALES", "BAUTISTA", "MANALO",
  "VILLANUEVA", "FERNANDEZ", "CRUZ", "DE LEON", "CASTILLO", "DIONISIO", "AQUINO", "TOLENTINO", "CASTRO", "RIVERA",
  "MAGNO", "SALVADOR", "PASCUAL", "VALDEZ", "SANTIAGO", "SORIANO", "MERCADO", "CORTEZ", "AGUILAR", "NAVARRO",
  "SERRANO", "CABRERA", "BALTAZAR", "BONDOC", "ANGELES", "ESPINOSA", "MACAPAGAL", "DOMINGO", "VERGARA", "SAMSON",
  "PANGANIBAN", "ILAGAN", "EVANGELISTA", "ALCANTARA", "PADILLA", "HERRERA", "LEGASPI", "DEL ROSARIO", "MALLARI", "VILLAMOR",
  "OCAMPO", "FERRER", "MEDINA", "MARQUEZ", "PEREZ", "DIZON", "ROSARIO", "RODRIGUEZ", "ESTRADA", "VALENZUELA",
  "ATIENZA", "GUZMAN", "CANLAS", "MIRANDA", "PABLO", "GOMEZ", "SOLIS", "CORONEL", "SANCHEZ", "JAVIER",
  "CUEVAS", "BERNARDO", "BELTRAN", "SALAS", "TAYAG", "LORENZO", "FELICIANO", "PUNZALAN", "ALONZO", "QUIAMBAO"
];

const givenNames = [
  "JOHN", "MARK", "CARL", "DAVE", "JAMES", "JOSHUA", "CHRISTIAN", "ANGELO", "DANIEL", "MATEO",
  "GABRIEL", "JUSTIN", "KEVIN", "MIGUEL", "NATHAN", "PAOLO", "RAFAEL", "SEBASTIAN", "TRISTAN", "VINCENT",
  "MARIA", "ANGELICA", "BEATRIZ", "CHLOE", "DIANNE", "ELLA", "FRANCESCA", "GWYNETH", "HANNAH", "ISABELLA",
  "JASMINE", "KATRINA", "LEANNE", "MIKAYLA", "NICOLE", "PATRICIA", "QUEENIE", "ROCHELLE", "SAMANTHA", "TRISHA",
  "ALEXANDER", "BRYAN", "CEDRIC", "DOMINIC", "ETHAN", "FRANCIS", "GERALD", "HARVEY", "IVAN", "JEROME",
  "KENNETH", "LANCE", "MARCO", "NEIL", "OLIVER", "PATRICK", "QUINTIN", "RENZ", "STEPHEN", "TIMOTHY",
  "ALTHEA", "BIANCA", "CAMILLE", "DENISE", "ERIKA", "FATIMA", "GISELLE", "HELENA", "IRIS", "JOYCE",
  "KIRSTEN", "LORRAINE", "MAUREEN", "NADINE", "ODETTE", "PRINCESS", "RAQUEL", "STEPHANIE", "THERESE", "VANESSA"
];

const middleNames = [
  "AGUHOB", "ALVAREZ", "BERNAL", "CABRIDO", "DAGOHOY", "ENCARNACION", "FAJARDO", "GALANG", "HENSON", "IGNACIO",
  "JALANDONI", "KATIGBAK", "LACSON", "MABINI", "NATIVIDAD", "ORTEGA", "PALMA", "QUIRINO", "RECTO", "SILANG",
  "TAN", "UMALI", "VENERACION", "YULO", "ZAMORA", "ABELLA", "BASCO", "CUSTODIO", "DIMACULANGAN", "ENRIQUEZ",
  "FORTICH", "GUEVARRA", "HERNANDEZ", "ISIP", "JOAQUIN", "KALAW", "LAUREL", "MALVAR", "NOBLE", "OBLIGACION",
  "PASTOR", "QUIMPO", "ROXAS", "SUMULONG", "TIAMSON", "UBALDO", "VILLAR", "YAP", "ZOBEL", "ADRIANO",
  "BUENAVENTURA", "CALIMLIM", "DAVID", "ESQUIVEL", "FRANCISCO", "GUTIERREZ", "HERMOSO", "ILUSTRE", "JACINTO", "KAPUNAN",
  "LACSAMANA", "MANALANG", "NICOLAS", "ONG", "PINEDA", "QUISON", "RAMIREZ", "SEVILLA", "TRINIDAD", "UY",
  "VALENCIA", "YAMBAO", "ZAPATA", "ABANIL", "BORJA", "CAPILI", "DIMAANO", "ESCUETA", "FUENTES", "GATUS"
];

const parentFirstNames = [
  "ROBERTO", "MARITES", "EDUARDO", "ROWENA", "FERNANDO", "LIZA", "RICARDO", "CRISTINA", "RAMON", "TERESA",
  "RENATO", "MELINDA", "ALFREDO", "IMELDA", "ERNESTO", "JOCELYN", "RODOLFO", "CORAZON", "BENJAMIN", "MYRNA",
  "ANTONIO", "EVELYN", "ORLANDO", "CARMELITA", "ROLANDO", "VILMA", "DANILO", "NERISSA", "EDGARDO", "ROSALINDA",
  "CESAR", "LOLITA", "JAIME", "AURORA", "MANUEL", "GLORIA", "SALVADOR", "ESTRELLA", "VICTOR", "FE",
  "ARTURO", "REBECCA", "OSCAR", "MILAGROS", "ROGELIO", "DIVINA", "REYNALDO", "LILIAN", "ALEJANDRO", "NORMA"
];

const strands = ["ICT", "HUMSS", "ABM", "GAS", "STEM"];
const grades = ["11", "12"];

const uniqueNames = new Set();
const rows = [];
const startId = 260001;

let idx = 0;
while (rows.length < 400) {
  const sLast = surnames[idx % surnames.length];
  const sFirst = givenNames[(idx * 7 + 13) % givenNames.length];
  const sMid = middleNames[(idx * 11 + 37) % middleNames.length];
  
  const fullName = `${sLast}, ${sFirst} ${sMid}`;
  if (uniqueNames.has(fullName)) {
    idx++;
    continue;
  }
  uniqueNames.add(fullName);

  const lrn = String(startId + rows.length);
  const gr = grades[rows.length % grades.length];
  const strand = strands[(rows.length * 3) % strands.length];

  const parentFirst = parentFirstNames[rows.length % parentFirstNames.length];
  const parentName = `${parentFirst} ${sLast}`;

  const phoneSuffix = String(1000000 + rows.length * 317).padStart(7, '0');
  const parentPhone = `0917${phoneSuffix}`;

  const cleanLast = sLast.toLowerCase().replace(/[^a-z]/g, '');
  const cleanFirst = sFirst.toLowerCase().replace(/[^a-z]/g, '');
  const parentGmail = `${cleanFirst}.${cleanLast}${rows.length + 1}@gmail.com`;

  rows.push([
    lrn,
    sLast,
    sFirst,
    sMid,
    gr,
    strand,
    parentName,
    parentPhone,
    parentGmail
  ]);
  idx++;
}

const header = [
  "LRN / Student ID",
  "Last Name",
  "First Name",
  "Middle Name",
  "Grade Level",
  "Strand",
  "Parent / Guardian Name",
  "Parent Mobile (09XXXXXXXXX)",
  "Parent Gmail (optional)"
];

const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
fs.writeFileSync('C:/AICS-CAPSTONE/AICS_MASTERLIST_400_STUDENTS.csv', csvContent, 'utf-8');
console.log(`Generated exactly ${rows.length} unique students!`);
console.log(`Unique full names count: ${uniqueNames.size}`);
