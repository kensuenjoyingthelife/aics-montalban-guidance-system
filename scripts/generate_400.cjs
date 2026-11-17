const fs = require('fs');

const firstNames = [
  'Juan', 'Maria', 'Jose', 'Mark', 'John', 'Paul', 'Angelo', 'Christian', 'Daniel', 'Joshua',
  'Kenneth', 'Jerome', 'Kimberly', 'Princess', 'Angelica', 'Nicole', 'Bea', 'Patricia', 'Camille', 'Jasmine',
  'Gabriel', 'Miguel', 'Rafael', 'Carlos', 'Anton', 'Bryan', 'Dominic', 'Justine', 'Patrick', 'Adrian',
  'Cedric', 'Kobe', 'Marcus', 'Nathan', 'Vincent', 'Kurt', 'Tristan', 'Elijah', 'Ethan', 'Sean',
  'Jhon', 'Carlo', 'Dave', 'Francis', 'Matthew', 'Luke', 'James', 'David', 'Andrea', 'Alyssa',
  'Rica', 'Celine', 'Joyce', 'Kyla', 'Mary', 'Rose', 'Faith', 'Grace', 'Hope', 'Joy',
  'Diana', 'Chloe', 'Samantha', 'Sofia', 'Kathleen', 'Hannah', 'Dianne', 'Bernadette', 'Katrina', 'Clarisse',
  'Bianca', 'Jellie', 'Maricar', 'Rachelle', 'Abigail', 'Mae', 'Kristine', 'Janine', 'Clariz', 'Gwen',
  'Ivan', 'Clark', 'Renz', 'Alden', 'Arvin', 'Rowell', 'Melvin', 'Rodolfo', 'Dennis', 'Edgar',
  'Ferdinand', 'Gilbert', 'Harold', 'Ian', 'Joel', 'Karl', 'Lawrence', 'Manuel', 'Noel', 'Oliver',
  'Peter', 'Quirino', 'Ramon', 'Samuel', 'Teodoro', 'Ulysses', 'Victor', 'Warren', 'Xavier', 'Yves',
  'Zachary', 'Althea', 'Breanna', 'Charisse', 'Danica', 'Ella', 'Franchesca', 'Giselle', 'Hazel', 'Ivy',
  'Jillian', 'Kayla', 'Leah', 'Mikaela', 'Naomi', 'Ophelia', 'Paula', 'Queenie', 'Rhian', 'Stephanie',
  'Thea', 'Ursula', 'Valerie', 'Wendy', 'Xena', 'Yvonne', 'Zoe', 'Aiden', 'Ben', 'Charles',
  'Dexter', 'Emman', 'Fred', 'George', 'Harry', 'Isaac', 'Jake', 'Kyle', 'Leo', 'Max',
  'Nico', 'Owen', 'Phil', 'Ray', 'Steve', 'Troy', 'Vince', 'Will', 'Zack', 'Aaron',
  'Bobby', 'Chris', 'Don', 'Eric', 'Frank', 'Glenn', 'Henry', 'Jayson', 'Kirk', 'Louie'
];

const lastNames = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andrada',
  'Castillo', 'Flores', 'Villanueva', 'Ramos', 'Castro', 'Rivera', 'Aquino', 'Navarro', 'Salazar', 'Mercado',
  'De Leon', 'Perez', 'Del Rosario', 'Soriano', 'Aguilar', 'Pineda', 'Manalo', 'Valenzuela', 'Tan', 'Morales',
  'Gomez', 'Cabrera', 'Guerrero', 'Reyes-Cruz', 'Diaz', 'Reyes-Santos', 'Alcantara', 'Sarmiento', 'Estrada', 'Padilla',
  'Santiago', 'Tolentino', 'Vergara', 'Corpuz', 'David', 'Domingo', 'Espiritu', 'Fajardo', 'Galang', 'Hernandez',
  'Ignacio', 'Jimenez', 'Lagman', 'Magno', 'Natividad', 'Ortega', 'Panganiban', 'Quizon', 'Rosario', 'San Jose',
  'Tinio', 'Umali', 'Valencia', 'Yap', 'Zamora', 'Abad', 'Beltran', 'Cordero', 'Dela Cruz', 'Enriquez',
  'Ferrer', 'Guinto', 'Ilagan', 'Javier', 'Lacson', 'Mallari', 'Nolasco', 'Ong', 'Pascual', 'Quinto',
  'Ramirez', 'Serrano', 'Tuazon', 'Urbano', 'Velasco', 'Yambao', 'Zapata', 'Agustin', 'Bernardo', 'Crisostomo',
  'Dizon', 'Evangelista', 'Francisco', 'Guevarra', 'Imperial', 'Juarez', 'Lim', 'Miranda', 'Nicolas', 'Ochoa'
];

const middleNames = [
  'Alvarez', 'Borja', 'Cortez', 'Dela Rosa', 'Escobar', 'Fernandez', 'Gervacio', 'Hermosa', 'Inocencio', 'Jaleco',
  'Kalaw', 'Ledesma', 'Magsaysay', 'Novero', 'Ordona', 'Palma', 'Querubin', 'Ricarte', 'Solis', 'Tiongson',
  'Untalan', 'Villaruel', 'Wenceslao', 'Ylagan', 'Zuniga', 'Arce', 'Balagtas', 'Capili', 'Datu', 'Eusebio',
  'Fabian', 'Gatbonton', 'Hilario', 'Isip', 'Jacinto', 'Katigbak', 'Laurel', 'Makalintal', 'Noble', 'Osorio'
];

const strands = ['ICT', 'ABM', 'HUMSS', 'STEM', 'GAS', 'TVL-HE'];

const rows = [
  ['LRN / Student ID', 'Last Name', 'First Name', 'Middle Name', 'Grade Level', 'Strand', 'Parent / Guardian Name', 'Parent Mobile (09XXXXXXXXX)', 'Parent Gmail (optional)'].join(',')
];

const seenFullNames = new Set();
let count = 0;
let lrn = 260001;

for (let l = 0; l < lastNames.length && count < 400; l++) {
  for (let f = 0; f < firstNames.length && count < 400; f++) {
    const lastName = lastNames[l];
    const firstName = firstNames[f];
    const middleName = middleNames[(l + f) % middleNames.length];
    const fullName = `${lastName}, ${firstName} ${middleName}`;

    if (!seenFullNames.has(fullName)) {
      seenFullNames.add(fullName);
      count++;

      const grade = (count % 2 === 0) ? '12' : '11';
      const strand = strands[(count - 1) % strands.length];
      const parentName = `Mrs. ${lastName}`;
      // Exactly 11 digits: '09' + 9 digits (e.g. 09170000001 to 09170000400)
      const phoneNum = '0917' + String(10000000 + count).slice(1);
      const email = `${firstName.toLowerCase().replace(/[^a-z]/g, '')}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}${count}@gmail.com`;

      rows.push([
        lrn,
        lastName,
        firstName,
        middleName,
        grade,
        strand,
        `"${parentName}"`,
        phoneNum,
        email
      ].join(','));

      lrn++;
    }
  }
}

fs.writeFileSync('AICS_MASTERLIST_400_STUDENTS.csv', rows.join('\r\n'), 'utf8');
console.log(`Successfully wrote ${rows.length - 1} unique student rows with 11-digit numbers into AICS_MASTERLIST_400_STUDENTS.csv`);
