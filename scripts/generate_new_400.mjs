import fs from 'fs';

// Modern Filipino Youth Names
const BOY_FIRST = [
  'JOHN', 'JOHN LESTER', 'ANDREI', 'LEXTER', 'RYAN', 'MICHAEL', 'CHRISTIAN', 'MARK',
  'JOSHUA', 'ANGELO', 'JUSTIN', 'CARL', 'DANIEL', 'NATHAN', 'GABRIEL', 'ADRIAN',
  'ALEXANDER', 'DAVE', 'ETHAN', 'JAKE', 'KYLE', 'LANCE', 'MARCO', 'PATRICK',
  'VINCENT', 'TRISTAN', 'SEAN', 'MIGUEL', 'KENNETH', 'JAMES', 'PAULO', 'JEROME',
  'AXEL', 'JAYDEN', 'LIAM', 'SEBASTIAN', 'KURT', 'CLARK', 'FRANCIS', 'DARWIN'
];

const GIRL_FIRST = [
  'MICHAELA', 'JASMIEN', 'MABEL', 'ANGEL', 'CHLOE', 'KATHLEEN', 'NICOLE', 'SOPHIA',
  'BEA', 'PRINCESS', 'JOYCE', 'ALEXA', 'BIANCA', 'CAMILLE', 'DENISE', 'ELLA',
  'FRANCHESKA', 'GWEN', 'HANNAH', 'IRISH', 'JASMINE', 'KAYLA', 'LARA', 'MARIANNE',
  'NADINE', 'PATRICIA', 'QUEENIE', 'ROCHELLE', 'SAMANTHA', 'TRISHA', 'VALERIE', 'YASMIN',
  'CHESKA', 'ERIKA', 'JANA', 'KLAIRE', 'LEONA', 'MIA', 'RIANNA', 'ZIA'
];

const LAST_NAMES = [
  'SANTOS', 'REYES', 'DELA CRUZ', 'BAUTISTA', 'GARCIA', 'MENDOZA', 'PASCUAL', 'RAMOS',
  'AQUINO', 'TORRES', 'FLORES', 'VILLANUEVA', 'CASTRO', 'RIVERA', 'FERNANDEZ', 'MANALO',
  'VALENZUELA', 'TOLENTINO', 'MERCADO', 'DOMINGO', 'DE LEON', 'ESPINOSA', 'NAVARRO', 'SALAZAR',
  'SORIANO', 'CORTEZ', 'CRUZ', 'PADILLA', 'HERNANDEZ', 'SANCHEZ', 'DEL ROSARIO', 'GUZMAN',
  'SANTIAGO', 'MORALES', 'SERRANO', 'AGUILAR', 'VALDEZ', 'CASTILLO', 'BALTAZAR', 'MIRANDA'
];

const MIDDLE_INITIALS = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'J.', 'K.', 'L.', 'M.', 'N.', 'P.', 'R.', 'S.', 'T.', 'V.'];

const G11_SECTIONS = [
  'Grade 11 - STEM 1', 'Grade 11 - STEM 2', 'Grade 11 - TVL-ICT 1', 'Grade 11 - TVL-ICT 2',
  'Grade 11 - ABM 1', 'Grade 11 - HUMSS 1', 'Grade 11 - HUMSS 2', 'Grade 11 - GAS 1'
];

const G12_SECTIONS = [
  'Grade 12 - STEM 1', 'Grade 12 - STEM 2', 'Grade 12 - TVL-ICT 1', 'Grade 12 - TVL-ICT 2',
  'Grade 12 - ABM 1', 'Grade 12 - HUMSS 1', 'Grade 12 - HUMSS 2', 'Grade 12 - GAS 1'
];

function generateStudents() {
  const students = [];
  const usedNames = new Set();

  function getUniqueName(isBoy, index) {
    const firstList = isBoy ? BOY_FIRST : GIRL_FIRST;
    for (let attempts = 0; attempts < 500; attempts++) {
      const last = LAST_NAMES[(index * 7 + attempts * 3) % LAST_NAMES.length];
      const first = firstList[(index * 3 + attempts) % firstList.length];
      const mid = MIDDLE_INITIALS[(index * 5 + attempts * 2) % MIDDLE_INITIALS.length];
      const fullName = `${last}, ${first} ${mid}`;
      if (!usedNames.has(fullName)) {
        usedNames.add(fullName);
        return { fullName, last, first, mid };
      }
    }
    const fallback = `${LAST_NAMES[index % LAST_NAMES.length]}, ${firstList[index % firstList.length]} ${index + 1} M.`;
    usedNames.add(fallback);
    return { fullName: fallback, last: LAST_NAMES[index % LAST_NAMES.length], first: firstList[index % firstList.length], mid: 'M.' };
  }

  // 1. Grade 11: 25-0001 to 25-0200 (100 boys, 100 girls)
  for (let i = 1; i <= 200; i++) {
    const isBoy = i % 2 !== 0; // Odd = boy, Even = girl
    const studentNum = `25-${String(i).padStart(4, '0')}`;
    const { fullName, last } = getUniqueName(isBoy, i);
    const section = G11_SECTIONS[i % G11_SECTIONS.length];
    const parentName = `Mrs. ${last}` || 'Parent';

    students.push({
      student_number: studentNum,
      full_name: fullName,
      initials: fullName.split(',')[1].trim().split(' ').map(w => w[0]).join('') || 'S',
      grade_section: section,
      section_code: section.split(' - ')[1] || 'STEM 1',
      parent_name: parentName,
      parent_relationship: isBoy ? 'Mother' : 'Mother',
      parent_phone: `0917${String(1000000 + i).slice(1)}`,
      parent_email: `parent.${studentNum.replace('-', '')}@gmail.com`,
      minor_offense_count: 0,
      major_offense_count: 0,
      clearance_status: 'Cleared',
      enrolled: true
    });
  }

  // 2. Grade 12: 26-0001 to 26-0200 (100 boys, 100 girls)
  for (let i = 1; i <= 200; i++) {
    const isBoy = i % 2 !== 0; // Odd = boy, Even = girl
    const studentNum = `26-${String(i).padStart(4, '0')}`;
    const { fullName, last } = getUniqueName(isBoy, 200 + i);
    const section = G12_SECTIONS[i % G12_SECTIONS.length];
    const parentName = `Mrs. ${last}` || 'Parent';

    students.push({
      student_number: studentNum,
      full_name: fullName,
      initials: fullName.split(',')[1].trim().split(' ').map(w => w[0]).join('') || 'S',
      grade_section: section,
      section_code: section.split(' - ')[1] || 'STEM 1',
      parent_name: parentName,
      parent_relationship: isBoy ? 'Mother' : 'Mother',
      parent_phone: `0918${String(1000000 + i).slice(1)}`,
      parent_email: `parent.${studentNum.replace('-', '')}@gmail.com`,
      minor_offense_count: 0,
      major_offense_count: 0,
      clearance_status: 'Cleared',
      enrolled: true
    });
  }

  return students;
}

const list = generateStudents();
console.log(`Generated ${list.length} students. Checking unique names: ${new Set(list.map(s => s.full_name)).size} / 400`);
fs.writeFileSync('scripts/generated_400_students.json', JSON.stringify(list, null, 2), 'utf8');
