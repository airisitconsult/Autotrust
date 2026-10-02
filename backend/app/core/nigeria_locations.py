"""Nigerian states and their Local Government Areas (LGAs), used to validate
and populate Vehicle.state / Vehicle.lga. Single source of truth — the
frontend fetches this via GET /reference/states-lgas rather than keeping its
own copy, so the two can never drift out of sync.

Source: Wikipedia's list of Nigerian LGAs (2026-10-02). The Federal Capital
Territory's six subdivisions are technically "Area Councils" rather than
LGAs, but are grouped here the same way most Nigerian consumer apps do.
"""

NIGERIA_STATES_LGAS: dict[str, list[str]] = {
    "Abia": [
        "Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano", "Isiala Ngwa North",
        "Isiala Ngwa South", "Isuikwuato", "Obi Ngwa", "Ohafia", "Osisioma Ngwa",
        "Ugwunagbo", "Ukwa East", "Ukwa West", "Umuahia North", "Umuahia South", "Umu Nneochi",
    ],
    "Adamawa": [
        "Demsa", "Fufure", "Ganye", "Guyuk", "Girei", "Gombi", "Hong", "Jada", "Lamurde",
        "Madagali", "Maiha", "Mayo Belwa", "Michika", "Mubi North", "Mubi South", "Numan",
        "Shelleng", "Song", "Toungo", "Yola North", "Yola South",
    ],
    "Akwa Ibom": [
        "Abak", "Eastern Obolo", "Eket", "Esit Eket", "Essien Udim", "Etim Ekpo", "Etinan",
        "Ibeno", "Ibesikpo Asutan", "Ibiono-Ibom", "Ika", "Ikono", "Ikot Abasi", "Ikot Ekpene",
        "Ini", "Itu", "Mbo", "Mkpat-Enin", "Nsit-Atai", "Nsit-Ibom", "Nsit-Ubium", "Obot Akara",
        "Okobo", "Onna", "Oron", "Oruk Anam", "Udung-Uko", "Ukanafun", "Uruan",
        "Urue-Offong/Oruko", "Uyo",
    ],
    "Anambra": [
        "Aguata", "Anambra East", "Anambra West", "Anaocha", "Awka North", "Awka South",
        "Ayamelum", "Dunukofia", "Ekwusigo", "Idemili North", "Idemili South", "Ihiala",
        "Njikoka", "Nnewi North", "Nnewi South", "Ogbaru", "Onitsha North", "Onitsha South",
        "Orumba North", "Orumba South", "Oyi",
    ],
    "Bauchi": [
        "Alkaleri", "Bauchi", "Bogoro", "Dambam", "Darazo", "Dass", "Gamawa", "Ganjuwa",
        "Giade", "Itas/Gadau", "Jama'are", "Katagum", "Kirfi", "Misau", "Ningi", "Shira",
        "Tafawa Balewa", "Toro", "Warji", "Zaki",
    ],
    "Bayelsa": [
        "Brass", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Ogbia", "Sagbama",
        "Southern Ijaw", "Yenagoa",
    ],
    "Benue": [
        "Ado", "Agatu", "Apa", "Buruku", "Gboko", "Guma", "Gwer East", "Gwer West",
        "Katsina-Ala", "Konshisha", "Kwande", "Logo", "Makurdi", "Obi", "Ogbadibo", "Ohimini",
        "Oju", "Okpokwu", "Oturkpo", "Tarka", "Ukum", "Ushongo", "Vandeikya",
    ],
    "Borno": [
        "Abadam", "Askira/Uba", "Bama", "Bayo", "Biu", "Chibok", "Damboa", "Dikwa", "Gubio",
        "Guzamala", "Gwoza", "Hawul", "Jere", "Kaga", "Kala/Balge", "Konduga", "Kukawa",
        "Kwaya Kusar", "Mafa", "Magumeri", "Maiduguri", "Marte", "Mobbar", "Monguno", "Ngala",
        "Nganzai", "Shani",
    ],
    "Cross River": [
        "Abi", "Akamkpa", "Akpabuyo", "Bakassi", "Bekwarra", "Biase", "Boki",
        "Calabar Municipal", "Calabar South", "Etung", "Ikom", "Obanliku", "Obubra", "Obudu",
        "Odukpani", "Ogoja", "Yakurr", "Yala",
    ],
    "Delta": [
        "Aniocha North", "Aniocha South", "Bomadi", "Burutu", "Ethiope East", "Ethiope West",
        "Ika North East", "Ika South", "Isoko North", "Isoko South", "Ndokwa East",
        "Ndokwa West", "Okpe", "Oshimili North", "Oshimili South", "Patani", "Sapele", "Udu",
        "Ughelli North", "Ughelli South", "Ukwuani", "Uvwie", "Warri North", "Warri South",
        "Warri South West",
    ],
    "Ebonyi": [
        "Abakaliki", "Afikpo", "Edda", "Ebonyi", "Ezza North", "Ezza South", "Ikwo", "Ishielu",
        "Ivo", "Izzi", "Ohaozara", "Ohaukwu", "Onicha",
    ],
    "Edo": [
        "Akoko-Edo", "Egor", "Esan Central", "Esan North-East", "Esan South-East",
        "Esan West", "Etsako Central", "Etsako East", "Etsako West", "Igueben",
        "Ikpoba Okha", "Orhionmwon", "Oredo", "Ovia North-East", "Ovia South-West",
        "Owan East", "Owan West", "Uhunmwonde",
    ],
    "Ekiti": [
        "Ado Ekiti", "Efon", "Ekiti East", "Ekiti South-West", "Ekiti West", "Emure",
        "Gbonyin", "Ido Osi", "Ijero", "Ikere", "Ikole", "Ilejemeje", "Irepodun/Ifelodun",
        "Ise/Orun", "Moba", "Oye",
    ],
    "Enugu": [
        "Aninri", "Awgu", "Enugu East", "Enugu North", "Enugu South", "Ezeagu",
        "Igbo Etiti", "Igbo Eze North", "Igbo Eze South", "Isi Uzo", "Nkanu East",
        "Nkanu West", "Nsukka", "Oji River", "Udenu", "Udi", "Uzo-Uwani",
    ],
    "Gombe": [
        "Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Gombe", "Kaltungo", "Kwami",
        "Nafada", "Shongom", "Yamaltu/Deba",
    ],
    "Imo": [
        "Aboh Mbaise", "Ahiazu Mbaise", "Ehime Mbano", "Ezinihitte", "Ideato North",
        "Ideato South", "Ihitte/Uboma", "Ikeduru", "Isiala Mbano", "Isu", "Mbaitoli",
        "Ngor Okpala", "Njaba", "Nkwerre", "Nwangele", "Obowo", "Oguta", "Ohaji/Egbema",
        "Okigwe", "Orlu", "Orsu", "Oru East", "Oru West", "Owerri Municipal", "Owerri North",
        "Owerri West", "Onuimo",
    ],
    "Jigawa": [
        "Auyo", "Babura", "Birniwa", "Birnin Kudu", "Buji", "Dutse", "Gagarawa", "Garki",
        "Gumel", "Guri", "Gwaram", "Gwiwa", "Hadejia", "Jahun", "Kafin Hausa", "Kaugama",
        "Kazaure", "Kiri Kasama", "Kiyawa", "Maigatari", "Malam Madori", "Miga", "Ringim",
        "Roni", "Sule Tankarkar", "Taura", "Yankwashi",
    ],
    "Kaduna": [
        "Birnin Gwari", "Chikun", "Giwa", "Igabi", "Ikara", "Jaba", "Jema'a", "Kachia",
        "Kaduna North", "Kaduna South", "Kagarko", "Kajuru", "Kaura", "Kauru", "Kubau",
        "Kudan", "Lere", "Makarfi", "Sabon Gari", "Sanga", "Soba", "Zangon Kataf", "Zaria",
    ],
    "Kano": [
        "Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala", "Dambatta",
        "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge", "Gabasawa", "Garko",
        "Garun Mallam", "Gaya", "Gezawa", "Gwale", "Gwarzo", "Kabo", "Kano Municipal",
        "Karaye", "Kibiya", "Kiru", "Kumbotso", "Kunchi", "Kura", "Madobi", "Makoda",
        "Minjibir", "Nasarawa", "Rano", "Rimin Gado", "Rogo", "Shanono", "Sumaila", "Takai",
        "Tarauni", "Tofa", "Tsanyawa", "Tudun Wada", "Ungogo", "Warawa", "Wudil",
    ],
    "Katsina": [
        "Bakori", "Batagarawa", "Batsari", "Baure", "Bindawa", "Charanchi", "Dandume",
        "Danja", "Dan Musa", "Daura", "Dutsi", "Dutsin Ma", "Faskari", "Funtua", "Ingawa",
        "Jibia", "Kafur", "Kaita", "Kankara", "Kankia", "Katsina", "Kurfi", "Kusada",
        "Mai'Adua", "Malumfashi", "Mani", "Mashi", "Matazu", "Musawa", "Rimi", "Sabuwa",
        "Safana", "Sandamu", "Zango",
    ],
    "Kebbi": [
        "Aleiro", "Arewa-Dandi", "Argungu", "Augie", "Bagudo", "Birnin Kebbi", "Bunza",
        "Dandi", "Fakai", "Gwandu", "Jega", "Kalgo", "Koko/Besse", "Maiyama", "Ngaski",
        "Sakaba", "Shanga", "Suru", "Wasagu/Danko", "Yauri", "Zuru",
    ],
    "Kogi": [
        "Adavi", "Ajaokuta", "Ankpa", "Bassa", "Dekina", "Ibaji", "Idah", "Igalamela-Odolu",
        "Kabba/Bunu", "Mopa-Muro", "Ijumu", "Yagba West", "Yagba East", "Ofu", "Okene",
        "Okehi", "Lokoja", "Ogori/Magongo", "Olamaboro", "Omala",
    ],
    "Kwara": [
        "Ekiti", "Ifelodun", "Ilorin East", "Ilorin West", "Irepodun", "Isin", "Kaiama",
        "Moro", "Offa", "Oke Ero", "Oyun", "Pategi", "Baruten", "Asa", "Edu", "Ilorin South",
    ],
    "Lagos": [
        "Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry", "Epe",
        "Eti Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe", "Lagos Island",
        "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere",
    ],
    "Nasarawa": [
        "Akwanga", "Awe", "Doma", "Karu", "Lafia", "Keana", "Obi", "Kokona", "Keffi",
        "Nasarawa", "Nasarawa Eggon", "Wamba", "Toto",
    ],
    "Niger": [
        "Agaie", "Agwara", "Bida", "Borgu", "Bosso", "Chanchaga", "Edati", "Gbako", "Gurara",
        "Katcha", "Kontagora", "Lapai", "Lavun", "Magama", "Mariga", "Mashegu", "Mokwa",
        "Munya", "Paikoro", "Rafi", "Rijau", "Shiroro", "Suleja", "Tafa", "Wushishi",
    ],
    "Ogun": [
        "Abeokuta North", "Abeokuta South", "Ado-Odo/Ota", "Ewekoro", "Ifo", "Ijebu North",
        "Ijebu North East", "Ijebu Ode", "Ijebu East", "Ilishan-Remo", "Ikenne",
        "Imeko Afon", "Ipokia", "Obafemi Owode", "Odeda", "Odogbolu", "Ogun Waterside",
        "Remo North", "Shagamu", "Yewa North", "Yewa South", "Isara",
    ],
    "Ondo": [
        "Akoko North-East", "Akoko North-West", "Akoko South-East", "Akoko South-West",
        "Akure North", "Akure South", "Ese Odo", "Ifedore", "Idanre", "Ilaje",
        "Ile-Oluji/Okeigbo", "Irele", "Odigbo", "Okitipupa", "Ondo West", "Ondo East",
        "Ose", "Owo",
    ],
    "Osun": [
        "Aiyedaade", "Aiyedire", "Atakunmosa East", "Atakunmosa West", "Boluwaduro",
        "Boripe", "Ede North", "Ede South", "Egbedore", "Ejigbo", "Ife Central", "Ife East",
        "Ife North", "Ife South", "Ifedayo", "Ifelodun", "Isokan", "Obokun", "Irewole",
        "Ola-Oluwa", "Olorunda", "Ilesa West", "Ilesa East", "Odo-Otin", "Ila", "Oriade",
        "Orolu", "Irepodun", "Iwo", "Osogbo",
    ],
    "Oyo": [
        "Afijio", "Akinyele", "Ibadan North", "Ibadan North-East", "Ibadan North-West",
        "Ibadan South-East", "Ibadan South-West", "Ibarapa Central", "Ibarapa East",
        "Ibarapa North", "Ido", "Irepo", "Iwajowa", "Iseyin", "Itesiwaju",
        "Ogbomosho North", "Ogbomosho South", "Ogo Oluwa", "Olorunsogo", "Oluyole",
        "Ona Ara", "Orelope", "Orire", "Atisbo", "Saki West", "Saki East", "Egbeda",
        "Lagelu", "Atiba", "Oyo East", "Oyo West",
    ],
    "Plateau": [
        "Barkin Ladi", "Bassa", "Bokkos", "Jos East", "Jos North", "Jos South", "Kanam",
        "Kanke", "Langtang North", "Langtang South", "Mangu", "Mikang", "Pankshin",
        "Qua'an-Pan", "Riyom", "Shendam", "Wase",
    ],
    "Rivers": [
        "Abua-Odual", "Ahoada East", "Ahoada West", "Akuku Toru", "Andoni", "Asari Toru",
        "Bonny", "Degema", "Eleme", "Emohua", "Etche", "Gokana", "Ikwerre", "Khana",
        "Obio-Akpor", "Ogba-Egbema-Ndoni", "Ogu-Bolo", "Okirika", "Omuma", "Opobo-Nkoro",
        "Oyigbo", "Port Harcourt", "Tai",
    ],
    "Sokoto": [
        "Binji", "Bodinga", "Dange Shuni", "Gada", "Sokoto South", "Sokoto North",
        "Gwadabawa", "Wamakko", "Tangaza", "Sabon Birni", "Isah", "Rabah", "Silame",
        "Wurno", "Goronyo", "Illela", "Gudu", "Tureta", "Tambuwal", "Kware",
    ],
    "Taraba": [
        "Ardo Kola", "Bali", "Donga", "Gashaka", "Gassol", "Ibi", "Jalingo", "Karim Lamido",
        "Kurmi", "Lau", "Sardauna", "Takum", "Ussa", "Wukari", "Yorro", "Zing",
    ],
    "Yobe": [
        "Bade", "Bursali", "Damaturu", "Fika", "Fune", "Geidam", "Gujba", "Gulani",
        "Jakusko", "Karasuwa", "Machina", "Nangere", "Nguru", "Potiskum", "Tarmuwa",
        "Yunusari", "Yusufari",
    ],
    "Zamfara": [
        "Anka", "Bakura", "Birnin Magaji/Kiyaw", "Bukkuyum", "Bungudu", "Tsafe", "Gummi",
        "Gusau", "Kaura-Namoda", "Maradun", "Maru", "Shinkafi", "Talata-Mafara", "Zurmi",
    ],
    "FCT": [
        "Abaji", "Abuja Municipal Area Council", "Kwali", "Kuje", "Bwari", "Gwagwalada",
    ],
}
