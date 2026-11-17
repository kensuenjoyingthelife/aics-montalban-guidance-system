import csv
import random

# Real common Filipino surnames (80 unique)
surnames = [
    "DELA CRUZ", "GARCIA", "REYES", "RAMOS", "MENDOZA", "SANTOS", "FLORES", "GONZALES", "BAUTISTA", "MANALO",
    "VILLANUEVA", "FERNANDEZ", "CRUZ", "DE LEON", "CASTILLO", "DIONISIO", "AQUINO", "TOLENTINO", "CASTRO", "RIVERA",
    "MAGNO", "SALVADOR", "PASCUAL", "VALDEZ", "SANTIAGO", "SORIANO", "MERCADO", "CORTEZ", "AGUILAR", "NAVARRO",
    "SERRANO", "CABRERA", "BALTAZAR", "BONDOC", "ANGELES", "ESPINOSA", "MACAPAGAL", "DOMINGO", "VERGARA", "SAMSON",
    "PANGANIBAN", "ILAGAN", "EVANGELISTA", "ALCANTARA", "PADILLA", "HERRERA", "LEGASPI", "DEL ROSARIO", "MALLARI", "VILLAMOR",
    "OCAMPO", "FERRER", "MEDINA", "MARQUEZ", "PEREZ", "DIZON", "ROSARIO", "RODRIGUEZ", "ESTRADA", "VALENZUELA",
    "ATIENZA", "GUZMAN", "CANLAS", "MIRANDA", "PABLO", "GOMEZ", "SOLIS", "CORONEL", "SANCHEZ", "JAVIER",
    "CUEVAS", "BERNARDO", "BELTRAN", "SALAS", "TAYAG", "LORENZO", "FELICIANO", "PUNZALAN", "ALONZO", "QUIAMBAO"
]

# Real common Filipino given names (80 unique)
given_names = [
    "JOHN", "MARK", "CARL", "DAVE", "JAMES", "JOSHUA", "CHRISTIAN", "ANGELO", "DANIEL", "MATEO",
    "GABRIEL", "JUSTIN", "KEVIN", "MIGUEL", "NATHAN", "PAOLO", "RAFAEL", "SEBASTIAN", "TRISTAN", "VINCENT",
    "MARIA", "ANGELICA", "BEATRIZ", "CHLOE", "DIANNE", "ELLA", "FRANCESCA", "GWYNETH", "HANNAH", "ISABELLA",
    "JASMINE", "KATRINA", "LEANNE", "MIKAYLA", "NICOLE", "PATRICIA", "QUEENIE", "ROCHELLE", "SAMANTHA", "TRISHA",
    "ALEXANDER", "BRYAN", "CEDRIC", "DOMINIC", "ETHAN", "FRANCIS", "GERALD", "HARVEY", "IVAN", "JEROME",
    "KENNETH", "LANCE", "MARCO", "NEIL", "OLIVER", "PATRICK", "QUINTIN", "RENZ", "STEPHEN", "TIMOTHY",
    "ALTHEA", "BIANCA", "CAMILLE", "DENISE", "ERIKA", "FATIMA", "GISELLE", "HELENA", "IRIS", "JOYCE",
    "KIRSTEN", "LORRAINE", "MAUREEN", "NADINE", "ODETTE", "PRINCESS", "RAQUEL", "STEPHANIE", "THERESE", "VANESSA"
]

# Real common middle names / maiden names (80 unique)
middle_names = [
    "AGUHOB", "ALVAREZ", "BERNAL", "CABRIDO", "DAGOHOY", "ENCARNACION", "FAJARDO", "GALANG", "HENSON", "IGNACIO",
    "JALANDONI", "KATIGBAK", "LACSON", "MABINI", "NATIVIDAD", "ORTEGA", "PALMA", "QUIRINO", "RECTO", "SILANG",
    "TAN", "UMALI", "VENERACION", "YULO", "ZAMORA", "ABELLA", "BASCO", "CUSTODIO", "DIMACULANGAN", "ENRIQUEZ",
    "FORTICH", "GUEVARRA", "HERNANDEZ", "ISIP", "JOAQUIN", "KALAW", "LAUREL", "MALVAR", "NOBLE", "OBLIGACION",
    "PASTOR", "QUIMPO", "ROXAS", "SUMULONG", "TIAMSON", "UBALDO", "VILLAR", "YAP", "ZOBEL", "ADRIANO",
    "BUENAVENTURA", "CALIMLIM", "DAVID", "ESQUIVEL", "FRANCISCO", "GUTIERREZ", "HERMOSO", "ILUSTRE", "JACINTO", "KAPUNAN",
    "LACSAMANA", "MANALANG", "NICOLAS", "ONG", "PINEDA", "QUISON", "RAMIREZ", "SEVILLA", "TRINIDAD", "UY",
    "VALENCIA", "YAMBAO", "ZAPATA", "ABANIL", "BORJA", "CAPILI", "DIMAANO", "ESCUETA", "FUENTES", "GATUS"
]

# Parent first names
parent_first_names = [
    "ROBERTO", "MARITES", "EDUARDO", "ROWENA", "FERNANDO", "LIZA", "RICARDO", "CRISTINA", "RAMON", "TERESA",
    "RENATO", "MELINDA", "ALFREDO", "IMELDA", "ERNESTO", "JOCELYN", "RODOLFO", "CORAZON", "BENJAMIN", "MYRNA",
    "ANTONIO", "EVELYN", "ORLANDO", "CARMELITA", "ROLANDO", "VILMA", "DANILO", "NERISSA", "EDGARDO", "ROSALINDA",
    "CESAR", "LOLITA", "JAIME", "AURORA", "MANUEL", "GLORIA", "SALVADOR", "ESTRELLA", "VICTOR", "FE",
    "ARTURO", "REBECCA", "OSCAR", "MILAGROS", "ROGELIO", "DIVINA", "REYNALDO", "LILIAN", "ALEJANDRO", "NORMA"
]

strands = ["ICT", "HUMSS", "ABM", "GAS", "STEM"]
grades = ["11", "12"]

# Generate exactly 400 unique students
unique_combinations = set()
students = []

student_id_start = 260001
random.seed(42) # Deterministic and clean

idx = 0
while len(students) < 400:
    s_last = surnames[idx % len(surnames)]
    s_first = given_names[(idx * 7 + 13) % len(given_names)]
    s_mid = middle_names[(idx * 11 + 37) % len(middle_names)]
    
    full_name_tuple = (s_last, s_first, s_mid)
    if full_name_tuple in unique_combinations:
        idx += 1
        continue
    
    unique_combinations.add(full_name_tuple)
    
    lrn = str(student_id_start + len(students))
    gr = grades[len(students) % len(grades)]
    strand = strands[(len(students) * 3) % len(strands)]
    
    parent_first = parent_first_names[len(students) % len(parent_first_names)]
    parent_name = f"{parent_first} {s_last}"
    
    phone_suffix = str(1000000 + len(students) * 217).zfill(7)
    parent_phone = f"0917{phone_suffix}"
    
    gmail_user = f"{s_first.lower()}.{s_last.lower().replace(' ', '')}{len(students)+1}@gmail.com"
    
    students.append({
        "LRN / Student ID": lrn,
        "Last Name": s_last,
        "First Name": s_first,
        "Middle Name": s_mid,
        "Grade Level": gr,
        "Strand": strand,
        "Parent / Guardian Name": parent_name,
        "Parent Mobile (09XXXXXXXXX)": parent_phone,
        "Parent Gmail (optional)": gmail_user
    })
    idx += 1

csv_path = "c:/AICS-CAPSTONE/AICS_MASTERLIST_400_STUDENTS.csv"
fieldnames = [
    "LRN / Student ID", "Last Name", "First Name", "Middle Name",
    "Grade Level", "Strand", "Parent / Guardian Name",
    "Parent Mobile (09XXXXXXXXX)", "Parent Gmail (optional)"
]

with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(students)

print(f"Generated {len(students)} unique students successfully in {csv_path}!")
