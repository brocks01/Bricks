"""Seeds ten Singapore demo communities, run by seniors, so the whole Connect UI can be tried before real data exists.

  python backend/run.py seed-demo                      # create them (if they are not there)
  python backend/run.py seed-demo you@example.com ...  # also add these existing accounts as members (the first one becomes Secretary of each)
  python backend/run.py seed-demo --reset              # delete the demo communities and the demo people again

The demo communities cover the social purpose of Wisdom: seniors as leaders and contributors (heritage, storytelling), earning and employability
(paid part-time work, mentoring), child care by the community, sustainability and culture. Everything is marked `is_demo` (the community) or uses the
address domain @demo.bricks.test (the people), so it can always be removed with --reset. The demo people cannot sign in. Join codes: BEDK-DEMO,
TOAP-DEMO, TAMP-DEMO, JURO-DEMO."""
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import text

from .core.db import engine

DOMAIN = "demo.bricks.test"
LEAD, SECRETARY, TREASURER, EVENTS = "lead", "secretary", "treasurer", "events"
ROLE_NAMES = {LEAD: ("Community Lead", True), SECRETARY: ("Secretary", True), TREASURER: ("Treasurer", False), EVENTS: ("Events Coordinator", True)}

# Each community: name, slug, kind, icon, member target, area, description, join code, core people, announcements, activities, contributions, opportunities.
# People are (name, area, age_band, role or None). The first four hold the roles; the lead is always a senior.
COMMUNITIES = [
    {
        "name": "Bedok Heritage Kakis", "slug": "bedok-heritage-kakis-demo", "kind": "neighbourhood", "icon": "book", "target": 214, "code": "BEDK-DEMO",
        "area": "Bedok North, Singapore",
        "desc": "Stories from Bedok's kampung days, told by the people who lived them, and passed on to the young.",
        "people": [("Lim Kok Leong", "Blk 78 Bedok North", "60plus", LEAD), ("Rahmah binte Ismail", "Blk 82 Bedok North", "60plus", SECRETARY),
                   ("Gerard D'Cruz", "Blk 75 Bedok North", "60plus", TREASURER), ("Wong Siew Lan", "Blk 80 Bedok North", "60plus", EVENTS),
                   ("Subramaniam Pillai", "Blk 78 Bedok North", "60plus", None), ("Ng Mei Hwa", "Blk 84 Bedok North", "60plus", None),
                   ("Yusof bin Hamid", "Blk 75 Bedok North", "60plus", None), ("Chua Bee Choo", "Blk 82 Bedok North", "60plus", None),
                   ("Priya Nambiar", "Blk 90 Bedok North", "under40", None), ("Jonathan Teo", "Blk 88 Bedok North", "under40", None)],
        "announcements": [("Welcome to Bedok Heritage Kakis", "Our stories, our recipes and our old photographs, kept safe for the next generation. Everyone is welcome, young and old.", True, 0, 30),
                          ("Old photographs of Bedok wanted", "Do you have photographs of the old Bedok market, the kampung or the sea before reclamation? Bring them on Saturday and we will scan them for the archive.", False, 1, 6),
                          ("Kopi and stories every Thursday", "Join us at the community club at 9.30 am. One elder tells a story, then everyone shares a cup of kopi.", False, 3, 2)],
        "activities": [("Kopitiam Storytelling Morning", "An elder tells a story from the kampung days, then the floor is open.", "Cultural Event", 1, 2, "Bedok North Community Club", 40),
                       ("Old Photographs Scanning Day", "Bring your family photographs. Volunteers scan them for the Bedok heritage archive.", "Workshop", 6, 4, "Blk 78 Void Deck", None),
                       ("Hari Raya Kuih with Rahmah", "Learn to make traditional kuih with Rahmah and take some home.", "Cultural Event", 12, 3, "Bedok North Community Club", 25)],
        "contributions": [(0, "time", "Recorded five kampung stories for the oral-history archive", 3.0), (1, "skill", "Taught twelve residents to make kuih", 4.0),
                          (2, "goods", "Donated forty old photographs of Bedok to the archive", None), (3, "time", "Welcomed newcomers at the Thursday storytelling morning", 2.0)],
        "opportunities": [(0, "job", "Heritage walk guide for school groups", "Paid S$20 per walk, about twice a month. Training given.", "Message Lim Kok Leong (Blk 78)"),
                          (1, "service", "Kuih orders for Hari Raya", "Order from Rahmah's kuih group. Income goes to the members who bake.", "Message Rahmah (Blk 82)")],
    },
    {
        "name": "Toa Payoh Silver Mentors", "slug": "toa-payoh-silver-mentors-demo", "kind": "club", "icon": "school", "target": 168, "code": "TOAP-DEMO",
        "area": "Toa Payoh, Singapore",
        "desc": "Retired professionals and skilled seniors mentoring children and job seekers, and earning a little for their time.",
        "people": [("Chandran Nair", "Blk 126 Toa Payoh Lorong 1", "60plus", LEAD), ("Teo Hwee Lian", "Blk 130 Toa Payoh Lorong 2", "60plus", SECRETARY),
                   ("Mohamed Faizal bin Rahim", "Blk 124 Toa Payoh Lorong 1", "60plus", TREASURER), ("Sharon Ong", "Blk 140 Toa Payoh Lorong 5", "40to59", EVENTS),
                   ("Tan Boon Hock", "Blk 126 Toa Payoh Lorong 1", "60plus", None), ("Kamala Devi", "Blk 132 Toa Payoh Lorong 2", "60plus", None),
                   ("Loh Yoke Mei", "Blk 128 Toa Payoh Lorong 1", "60plus", None), ("Ahmad Zulkifli", "Blk 142 Toa Payoh Lorong 5", "40to59", None),
                   ("Rachel Sim", "Blk 138 Toa Payoh Lorong 4", "under40", None)],
        "announcements": [("Welcome to Toa Payoh Silver Mentors", "Thirty years of work experience is worth sharing. Mentor a child, review a CV or teach a skill, and be paid fairly when the work is paid.", True, 0, 28),
                          ("Homework Buddies are looking for more mentors", "Primary school pupils need a patient adult for one hour after school. Training and a short briefing are provided.", False, 1, 5),
                          ("Free CV clinic for mid-career job seekers", "Our mentors from HR, engineering and banking will review your CV and practise interviews with you.", False, 3, 2)],
        "activities": [("Homework Buddies for Primary Pupils", "One hour of reading and maths help with a senior mentor, after school.", "Education", 2, 1, "Toa Payoh Community Library", 20),
                       ("CV Clinic for Mid-career Job Seekers", "One-to-one CV reviews and interview practice with retired professionals.", "Workshop", 7, 3, "Toa Payoh Community Club", 30),
                       ("Digital Skills with Silver Mentors", "Learn to use your phone for banking, video calls and healthcare appointments.", "Workshop", 13, 2, "Blk 126 Void Deck", 25)],
        "contributions": [(0, "skill", "Mentored three pupils in maths for a full term", 12.0), (1, "time", "Ran the registration desk at the CV clinic", 3.0),
                          (2, "skill", "Reviewed the community's yearly accounts", 5.0), (4, "skill", "Reviewed eleven CVs for mid-career job seekers", 6.0)],
        "opportunities": [(0, "job", "Part-time tuition mentor, primary school", "Paid S$18 per hour, two afternoons a week. Seniors with teaching or work experience are welcome.", "Message Chandran Nair (Blk 126)"),
                          (3, "service", "Free CV review for job seekers", "One-to-one, 45 minutes, with a retired HR professional.", "Message Sharon Ong (Blk 140)")],
    },
    {
        "name": "Tampines Kampung Spirit", "slug": "tampines-kampung-spirit-demo", "kind": "neighbourhood", "icon": "people", "target": 96, "code": "TAMP-DEMO",
        "area": "Tampines, Singapore",
        "desc": "Neighbours looking after each other's children and elders, the way the kampung used to.",
        "people": [("Hajah Zainab binte Salleh", "Blk 455 Tampines Street 42", "60plus", LEAD), ("Goh Lay Hoon", "Blk 457 Tampines Street 42", "60plus", SECRETARY),
                   ("Krishnan Muthu", "Blk 453 Tampines Street 41", "60plus", TREASURER), ("Aisyah Rahman", "Blk 460 Tampines Street 44", "under40", EVENTS),
                   ("Lee Choon Kiat", "Blk 455 Tampines Street 42", "60plus", None), ("Margaret Pereira", "Blk 458 Tampines Street 42", "60plus", None),
                   ("Salmah binte Yaakob", "Blk 453 Tampines Street 41", "60plus", None), ("Daniel Chan", "Blk 462 Tampines Street 44", "40to59", None)],
        "announcements": [("Welcome to Tampines Kampung Spirit", "Parents who work late, grandparents who love company: we mind each other's families. Everyone is welcome.", True, 0, 25),
                          ("Grandparents' storytime for children is back", "Every Wednesday after school, a grandparent reads or tells a story in their own language. Parents can drop in.", False, 1, 4),
                          ("Tai chi at the void deck, Saturday mornings", "Gentle exercise for all ages, led by Mr Lee. No experience needed.", False, 3, 1)],
        "activities": [("Tai Chi at the Void Deck", "Gentle morning exercise for all ages, led by a senior member.", "Fitness", 1, 1, "Blk 455 Void Deck", None),
                       ("Grandparents' Storytime for Children", "A grandparent tells a story in their own language, then the children draw it.", "Cultural Event", 3, 1, "Tampines Community Library", 20),
                       ("Kampung Potluck Lunch", "Everyone brings a dish from home. Meet the neighbours who live on your floor.", "Social", 10, 3, "Blk 453 Void Deck", 60)],
        "contributions": [(0, "time", "Minded six children while their parents attended a workshop", 4.0), (1, "skill", "Taught a sewing class for beginners", 3.0),
                          (4, "time", "Led the Saturday tai chi group for a month", 4.0), (5, "goods", "Donated children's storybooks to the library corner", None)],
        "opportunities": [(0, "service", "After-school care helpers", "Seniors are welcome. Small allowance, two afternoons a week, training given.", "Message Hajah Zainab (Blk 455)"),
                          (5, "referral", "Trusted home-based caregiver", "Experienced and kind. Ask for Margaret's recommendation.", "Message Margaret (Blk 458)")],
    },
    {
        "name": "Jurong Green Gardeners", "slug": "jurong-green-gardeners-demo", "kind": "neighbourhood", "icon": "leaf", "target": 58, "code": "JURO-DEMO",
        "area": "Jurong West, Singapore",
        "desc": "Seniors and neighbours growing vegetables, composting and keeping the estate green together.",
        "people": [("Leong Chee Keong", "Blk 646 Jurong West Street 61", "60plus", LEAD), ("Fatimah binte Osman", "Blk 648 Jurong West Street 61", "60plus", SECRETARY),
                   ("Ravi Shankar", "Blk 650 Jurong West Street 64", "60plus", TREASURER), ("Tan Mei Xin", "Blk 652 Jurong West Street 64", "under40", EVENTS),
                   ("Ong Ah Lian", "Blk 646 Jurong West Street 61", "60plus", None), ("Hassan bin Abdullah", "Blk 654 Jurong West Street 65", "60plus", None),
                   ("Vivian Koh", "Blk 650 Jurong West Street 64", "40to59", None)],
        "announcements": [("Welcome to Jurong Green Gardeners", "Our community garden feeds the neighbourhood and keeps seniors active. Come and get your hands dirty.", True, 0, 26),
                          ("Composting workshop this month", "Learn to turn kitchen waste into soil. Free for residents, led by our senior gardeners.", False, 1, 5),
                          ("Spinach and kangkong ready to harvest", "Take what you need and leave a few leaves for the next person.", False, 3, 1)],
        "activities": [("Community Garden Planting Morning", "Plant chilli, kangkong and lemongrass with our senior gardeners.", "Environment Drive", 2, 3, "Jurong West Community Garden", 30),
                       ("Composting Workshop", "Turn kitchen waste into soil. Take a small bin home.", "Workshop", 8, 2, "Blk 646 Void Deck", 25),
                       ("Herb and Seedling Swap", "Bring a cutting or seedling, take one home.", "Social", 14, 2, "Jurong West Community Garden", None)],
        "contributions": [(0, "skill", "Built six raised beds for the community garden", 8.0), (1, "time", "Watered and weeded the garden for the whole month", 6.0),
                          (4, "goods", "Donated seedlings and soil for the new beds", None), (5, "skill", "Showed 15 neighbours how to start a compost bin", 2.0)],
        "opportunities": [(0, "job", "Garden workshop facilitator", "Paid S$25 per session, once or twice a month. Seniors with gardening experience welcome.", "Message Leong Chee Keong (Blk 646)"),
                          (3, "service", "Volunteers to water the garden on weekdays", "Pick your own day. Fresh vegetables to take home.", "Message Tan Mei Xin (Blk 652)")],
    },
    # ---- six more (revamp v2): so every interest and every onboarding area has a community near it ----
    {
        "name": "Bishan Walkers", "slug": "bishan-walkers-demo", "kind": "club", "icon": "walk", "target": 74, "code": "BISH-DEMO",
        "area": "Bishan, Singapore",
        "desc": "A steady morning walk round Bishan-Ang Mo Kio Park, then kopi together. Every pace is welcome.",
        "people": [("Seah Kim Huat", "Blk 152 Bishan Street 11", "60plus", LEAD), ("Norhayati binte Kassim", "Blk 154 Bishan Street 13", "60plus", SECRETARY),
                   ("Anand Ramasamy", "Blk 150 Bishan Street 11", "60plus", TREASURER), ("Cheryl Lim", "Blk 158 Bishan Street 13", "40to59", EVENTS),
                   ("Koh Ah Moi", "Blk 152 Bishan Street 11", "60plus", None), ("Bernard Fernandez", "Blk 156 Bishan Street 13", "60plus", None)],
        "announcements": [("Welcome to Bishan Walkers", "We walk three mornings a week and finish with kopi. Come as you are; nobody is left behind.", True, 0, 21),
                          ("New route by the river", "From next week we try the river path. It is flat and shaded.", False, 1, 3)],
        "activities": [("Morning Walk in Bishan Park", "Five kilometres at an easy pace, then kopi at the hawker centre.", "Fitness", 1, 2, "Bishan-Ang Mo Kio Park, Car Park A", None),
                       ("Riverside Walk and Kopi", "The flat, shaded river path. Bring a hat and water.", "Fitness", 3, 2, "Bishan-Ang Mo Kio Park, Pond Gardens", None),
                       ("Walk and Talk: Health Check Morning", "A short walk, then free blood pressure checks by volunteer nurses.", "Health", 9, 3, "Bishan Community Club", 40)],
        "contributions": [(0, "time", "Led the Monday walk for two months", 8.0), (3, "time", "Organised the health check morning with the polyclinic", 4.0)],
        "opportunities": [(0, "service", "Walking buddy for a neighbour recovering from surgery", "Twice a week, slow pace, about 30 minutes.", "Message Seah Kim Huat (Blk 152)")],
    },
    {
        "name": "Ang Mo Kio Tai Chi Circle", "slug": "ang-mo-kio-tai-chi-circle-demo", "kind": "club", "icon": "body", "target": 88, "code": "AMKT-DEMO",
        "area": "Ang Mo Kio, Singapore",
        "desc": "Slow tai chi under the trees before the sun is high, followed by a gentle walk for those who want one.",
        "people": [("Low Teck Seng", "Blk 405 Ang Mo Kio Avenue 10", "60plus", LEAD), ("Siti Mariam binte Ali", "Blk 407 Ang Mo Kio Avenue 10", "60plus", SECRETARY),
                   ("Gopal Krishnan", "Blk 409 Ang Mo Kio Avenue 10", "60plus", TREASURER), ("Jasmine Tay", "Blk 411 Ang Mo Kio Avenue 10", "40to59", EVENTS),
                   ("Chan Kwai Fong", "Blk 405 Ang Mo Kio Avenue 10", "60plus", None), ("Yeo Bee Hong", "Blk 413 Ang Mo Kio Avenue 10", "60plus", None)],
        "announcements": [("Welcome to the Tai Chi Circle", "Every weekday at 7 am. Beginners stand at the back and follow; nobody minds a wrong step.", True, 0, 30),
                          ("Beginners' class on Saturday", "Mr Low teaches the first eight movements slowly. Wear comfortable shoes.", False, 1, 4)],
        "activities": [("Morning Tai Chi", "Thirty minutes of slow tai chi, then a gentle walk round the garden.", "Fitness", 1, 1, "Ang Mo Kio Town Garden West", None),
                       ("Tai Chi for Beginners", "The first eight movements, taught slowly. Chairs for anyone who needs one.", "Fitness", 4, 1, "Ang Mo Kio Town Garden West", 30),
                       ("Fan Tai Chi Workshop", "Learn the fan form, step by step.", "Workshop", 11, 2, "Ang Mo Kio Community Centre", 25)],
        "contributions": [(0, "skill", "Taught the beginners' class every Saturday this term", 12.0), (1, "time", "Kept the attendance and called members who missed a week", 3.0)],
        "opportunities": [(0, "job", "Tai chi instructor for an Active Ageing Centre", "Paid S$30 per class, weekday mornings.", "Message Low Teck Seng (Blk 405)")],
    },
    {
        "name": "Woodlands Chess Corner", "slug": "woodlands-chess-corner-demo", "kind": "club", "icon": "grid", "target": 46, "code": "WOOD-DEMO",
        "area": "Woodlands, Singapore",
        "desc": "Xiangqi and chess at the void deck every afternoon, with kopi. Children learn from the uncles on Saturdays.",
        "people": [("Teo Chin Hock", "Blk 768 Woodlands Avenue 6", "60plus", LEAD), ("Abdul Rahim bin Yusof", "Blk 770 Woodlands Avenue 6", "60plus", SECRETARY),
                   ("Selvam Pillai", "Blk 772 Woodlands Drive 60", "60plus", TREASURER), ("Ryan Ng", "Blk 774 Woodlands Drive 60", "under40", EVENTS),
                   ("Lau Kim Swee", "Blk 768 Woodlands Avenue 6", "60plus", None), ("Ho Siew Choo", "Blk 776 Woodlands Drive 60", "60plus", None)],
        "announcements": [("Welcome to Woodlands Chess Corner", "Bring nothing but yourself: boards, pieces and kopi are here every afternoon from 2 pm.", True, 0, 19),
                          ("Saturday lessons for children", "Uncle Teo teaches xiangqi to children aged 7 to 12. Parents are welcome to watch.", False, 1, 2)],
        "activities": [("Afternoon Xiangqi and Kopi", "Open games for all levels. Boards provided.", "Social", 1, 3, "Blk 768 Woodlands Avenue 6 Void Deck", None),
                       ("Xiangqi for Children", "Uncles teach children the moves and the old strategies.", "Education", 3, 2, "Woodlands Regional Library", 20),
                       ("Friendly Tournament with Marsiling", "A friendly match against the Marsiling chess group, with lunch.", "Competition", 13, 4, "Woodlands Community Club", 40)],
        "contributions": [(0, "skill", "Taught xiangqi to twelve children this term", 10.0), (2, "goods", "Donated six chess sets", None)],
        "opportunities": [(0, "service", "Chess coach for a primary school club", "One afternoon a week; a small allowance is paid.", "Message Teo Chin Hock (Blk 768)")],
    },
    {
        "name": "Toa Payoh Music Makers", "slug": "toa-payoh-music-makers-demo", "kind": "club", "icon": "musical-notes", "target": 63, "code": "TPMM-DEMO",
        "area": "Toa Payoh, Singapore",
        "desc": "Old songs in four languages, a harmonica band and a ukulele circle. We sing for ourselves and for the wards nearby.",
        "people": [("Wong Kah Wai", "Blk 79 Toa Payoh Central", "60plus", LEAD), ("Zaleha binte Ahmad", "Blk 81 Toa Payoh Central", "60plus", SECRETARY),
                   ("Joseph D'Silva", "Blk 83 Toa Payoh Lorong 4", "60plus", TREASURER), ("Melissa Goh", "Blk 85 Toa Payoh Lorong 4", "40to59", EVENTS),
                   ("Lim Siew Kheng", "Blk 79 Toa Payoh Central", "60plus", None), ("Murugan Raj", "Blk 87 Toa Payoh Lorong 4", "60plus", None)],
        "announcements": [("Welcome to Toa Payoh Music Makers", "No experience needed. If you can hum, you can join the choir.", True, 0, 24),
                          ("Ukulele circle needs two more players", "Ukuleles can be borrowed. First lesson is free.", False, 1, 3)],
        "activities": [("Sing-along of Old Favourites", "Songs in Mandarin, Malay, Tamil and English. Lyrics in large print.", "Cultural Event", 2, 2, "Toa Payoh Central Community Club", 50),
                       ("Ukulele Circle for Beginners", "Learn three chords and play your first song in an hour.", "Workshop", 5, 1, "Blk 79 Toa Payoh Central, Level 1", 15),
                       ("Choir Practice for the Year-end Concert", "We practise the songs for the year-end concert at the community club.", "Cultural Event", 12, 2, "Toa Payoh Central Community Club", 40)],
        "contributions": [(0, "skill", "Arranged ten songs for the choir in large print", 6.0), (2, "time", "Set up the sound system for every sing-along", 3.0)],
        "opportunities": [(0, "job", "Music facilitator for an Active Ageing Centre", "Paid S$40 per session, twice a month.", "Message Wong Kah Wai (Blk 79)")],
    },
    {
        "name": "Jurong West Digital Buddies", "slug": "jurong-west-digital-buddies-demo", "kind": "club", "icon": "phone-portrait", "target": 52, "code": "JWDB-DEMO",
        "area": "Jurong West, Singapore",
        "desc": "Young volunteers and tech-savvy seniors helping neighbours with phones, banking apps and video calls, one question at a time.",
        "people": [("Kwek Hui Ling", "Blk 503 Jurong West Avenue 1", "60plus", LEAD), ("Mohammad Iskandar", "Blk 505 Jurong West Avenue 1", "40to59", SECRETARY),
                   ("Lakshmi Narayanan", "Blk 507 Jurong West Street 52", "60plus", TREASURER), ("Darren Ong", "Blk 509 Jurong West Street 52", "under40", EVENTS),
                   ("Chew Boon Lay", "Blk 503 Jurong West Avenue 1", "60plus", None), ("Rosmah binte Said", "Blk 511 Jurong West Street 52", "60plus", None)],
        "announcements": [("Welcome to Digital Buddies", "Bring your phone and your question. We sit with you until it works.", True, 0, 22),
                          ("Beware of scam calls", "If someone asks for your bank code, hang up and call us. We will check it with you.", False, 0, 2)],
        "activities": [("Phone Help Clinic", "Bring your phone: banking apps, WhatsApp, HealthHub and more.", "Workshop", 2, 2, "Jurong West Public Library", 30),
                       ("Video Calls with Family Abroad", "Set up video calls and practise with a volunteer.", "Workshop", 6, 2, "Blk 503 Jurong West Avenue 1 Void Deck", 20),
                       ("Spot the Scam", "Real scam messages, and how to tell them apart from your bank.", "Talk", 10, 1, "Jurong Spring Community Club", 50)],
        "contributions": [(0, "skill", "Helped 30 seniors set up their banking apps safely", 10.0), (3, "time", "Ran the phone help clinic every Saturday", 8.0)],
        "opportunities": [(0, "service", "Tech mentor for seniors", "Teach one neighbour a week. Retired engineers and teachers welcome.", "Message Kwek Hui Ling (Blk 503)")],
    },
    {
        "name": "Bishan Home Cooks", "slug": "bishan-home-cooks-demo", "kind": "club", "icon": "restaurant", "target": 57, "code": "BHCK-DEMO",
        "area": "Bishan, Singapore",
        "desc": "Recipes from our mothers' kitchens: we cook together, eat together and write the recipes down for the grandchildren.",
        "people": [("Chia Poh Lin", "Blk 236 Bishan Street 22", "60plus", LEAD), ("Faridah binte Hashim", "Blk 238 Bishan Street 22", "60plus", SECRETARY),
                   ("Mary Thomas", "Blk 240 Bishan Street 23", "60plus", TREASURER), ("Kelvin Yeo", "Blk 242 Bishan Street 23", "under40", EVENTS),
                   ("Soh Geok Lian", "Blk 236 Bishan Street 22", "60plus", None), ("Parvathi Subramaniam", "Blk 244 Bishan Street 23", "60plus", None)],
        "announcements": [("Welcome to Bishan Home Cooks", "We cook one family recipe a month and write it into our book. Bring an apron and an appetite.", True, 0, 27),
                          ("Ondeh-ondeh with Madam Chia", "This month: ondeh-ondeh and kueh salat. Ingredients provided.", False, 1, 4)],
        "activities": [("Ondeh-ondeh and Kueh Salat", "Madam Chia shows how her mother made them. Take a box home.", "Cooking", 3, 3, "Bishan Community Club Kitchen", 20),
                       ("Curry Afternoon with Mary", "Mary Thomas teaches her family's fish curry.", "Cooking", 9, 3, "Bishan Community Club Kitchen", 20),
                       ("Recipe Book Writing Morning", "Young volunteers type and photograph the recipes the elders dictate.", "Cultural Event", 15, 2, "Bishan Public Library", 25)],
        "contributions": [(0, "skill", "Taught three classes of traditional kueh", 9.0), (3, "time", "Photographed twenty recipes for the book", 5.0)],
        "opportunities": [(1, "service", "Kueh orders for festivals", "Order from the group; the money goes to the members who bake.", "Message Faridah (Blk 238)")],
    },
]

# Where each demo community meets and what it is about (the eight onboarding interests), used for the map and to rank communities for a person.
DETAILS = {  # slug -> (address, interests)
    "bedok-heritage-kakis-demo": ("Bedok North Community Club, 1 Bedok North Street 1, Singapore 469659", ["teaching", "music"]),
    "toa-payoh-silver-mentors-demo": ("Toa Payoh Public Library, 6 Toa Payoh Central, Singapore 319191", ["teaching", "tech"]),
    "tampines-kampung-spirit-demo": ("Blk 455 Tampines Street 42, Singapore 520455", ["cooking", "taichi"]),
    "jurong-green-gardeners-demo": ("Blk 646 Jurong West Street 61, Singapore 640646", ["gardening"]),
    "bishan-walkers-demo": ("Bishan-Ang Mo Kio Park, 1384 Ang Mo Kio Avenue 1, Singapore 569931", ["walking"]),
    "ang-mo-kio-tai-chi-circle-demo": ("Ang Mo Kio Town Garden West, Ang Mo Kio Avenue 6, Singapore", ["taichi", "walking"]),
    "woodlands-chess-corner-demo": ("Blk 768 Woodlands Avenue 6, Singapore 730768", ["chess"]),
    "toa-payoh-music-makers-demo": ("Toa Payoh Central Community Club, 93 Toa Payoh Central, Singapore 319194", ["music"]),
    "jurong-west-digital-buddies-demo": ("Jurong West Public Library, 60 Jurong West Central 3, Singapore 648346", ["tech", "teaching"]),
    "bishan-home-cooks-demo": ("Bishan Community Club, 51 Bishan Street 13, Singapore 579799", ["cooking"]),
}

# Real photos, linked directly from Unsplash (free to use under the Unsplash License; no key needed). Replace with your own uploads (Cloudinary) any time:
# change the cover_url / image_url in the database, or upload through POST /v1/media/upload once the CLOUDINARY_* keys are in backend/.env.
def _img(photo: str) -> str:
    return f"https://images.unsplash.com/photo-{photo}?w=800&q=70&auto=format&fit=crop"


PHOTOS = {  # slug -> (cover, [one image per activity, in order])
    "bedok-heritage-kakis-demo": ("1648365304143-9aa30adbf8e4", ["1648365306256-7892c24362d6", "1700553856089-1ea9261143a7", "1779719762208-f3d2f100445b"]),
    "toa-payoh-silver-mentors-demo": ("1642413140777-0a3bf5ff39e5", ["1604940293595-be295d67ad9e", "1591688342010-d71fbf89b4c3", "1782150924537-7a4fe94d837f"]),
    "tampines-kampung-spirit-demo": ("1624730088819-01a310dbc10b", ["1763901682710-a18f6a7d9531", "1604940293595-be295d67ad9e", "1770184428372-ad4d28b9aef4"]),
    "jurong-green-gardeners-demo": ("1757585267523-f689c297fa2d", ["1621460248083-6271cc4437a8", "1611843467160-25afb8df1074", "1597868165956-03a6827955b1"]),
}
# The six newer communities take their pictures from the checked list in seed_data/images.json (Wikimedia, free-licensed, with credit there),
# chosen by hand so each fits: (category, index) for the cover, then one per activity.
PICKS = {
    "bishan-walkers-demo": [("activity_exercise", 15), ("activity_exercise", 14), ("elders", 14), ("activity_exercise", 15)],
    "ang-mo-kio-tai-chi-circle-demo": [("activity_exercise", 0), ("activity_exercise", 1), ("activity_exercise", 3), ("activity_exercise", 2)],
    "woodlands-chess-corner-demo": [("activity_social", 9), ("activity_social", 6), ("activity_social", 9), ("activity_social", 8)],
    "toa-payoh-music-makers-demo": [("activity_social", 13), ("activity_social", 14), ("activity_social", 13), ("activity_social", 14)],
    "jurong-west-digital-buddies-demo": [("elders", 0), ("elders", 2), ("elders", 0), ("elders", 2)],
    "bishan-home-cooks-demo": [("activity_cooking", 5), ("activity_cooking", 6), ("activity_cooking", 0), ("activity_cooking", 7)],
}


def _photos(slug: str, n: int) -> tuple[str, list[str]]:
    """The cover and one picture per activity: the Unsplash ones for the first four, the hand-picked checked ones for the rest."""
    if slug in PHOTOS:
        cover, acts = PHOTOS[slug]
        return _img(cover), [_img(a) for a in acts]
    cats = json.loads((Path(__file__).resolve().parents[1] / "seed_data" / "images.json").read_text(encoding="utf-8"))["by_category"]
    urls = []
    for cat, i in PICKS[slug][: n + 1]:
        item = cats[cat][i]
        u = item["url"] if isinstance(item, dict) else item
        urls.append(u.split("?")[0] if "wikimedia.org" in u else u)
    return urls[0], urls[1:]

# Names for the rest of each community (Singapore's Chinese, Malay, Indian and Eurasian communities). Mostly seniors, as in the communities themselves.
FIRST = ["Ah Hock", "Ai Ling", "Beng Huat", "Bee Lian", "Cheng Hock", "Chin Siong", "Siew Mei", "Eng Kiat", "Geok Eng", "Hock Seng", "Kim Hwa", "Lay Choo", "Mei Lan", "Poh Choo",
         "Swee Lian", "Teck Kiong", "Yoke Lin", "Zainal", "Aminah", "Ismail", "Halimah", "Kamarudin", "Rosnah", "Salleh", "Normah", "Osman", "Sulaiman", "Zubaidah", "Kumar", "Devi",
         "Muthu", "Selvi", "Rajan", "Shanti", "Balakrishnan", "Meenakshi", "Gopal", "Parvathy", "Anthony", "Cecilia", "Francis", "Joyce", "Raymond", "Theresa", "Vincent", "Winnie"]
LAST = ["Tan", "Lim", "Lee", "Ng", "Ong", "Wong", "Goh", "Chua", "Teo", "Koh", "Yeo", "Sim", "Chan", "Ho", "Low", "Ismail", "Rahman", "Hassan", "Abdullah", "Yusof", "Osman", "Salleh",
        "Pillai", "Nair", "Krishnan", "Muthu", "Subramaniam", "Rajan", "Pereira", "D'Cruz", "De Souza", "Oliveiro"]


def real_people(n: int) -> list[tuple[str, str]]:
    """n distinct people with real-sounding Singapore names and an address-like handle on the demo domain."""
    out, seen = [], set()
    i = 0
    while len(out) < n:
        f, l = FIRST[i % len(FIRST)], LAST[(i * 5 + i // len(FIRST)) % len(LAST)]
        i += 1
        name = f"{f} {l}"
        if name in seen:
            continue
        seen.add(name)
        out.append((name, f"{f}.{l}".lower().replace(" ", "").replace("'", "") + f".{len(out) + 1}@{DOMAIN}"))
    return out


def reset(conn) -> None:
    conn.execute(text("delete from communities where is_demo"))  # cascades to everything inside them
    conn.execute(text("delete from users where email like :d"), {"d": f"%@{DOMAIN}"})


def _handle(name: str, slug: str) -> str:
    return f"{name.lower().replace(' ', '.').replace(chr(39), '')}.{slug.split('-')[0]}@{DOMAIN}"


def _role(conn, cid, key: str):
    name, manage = ROLE_NAMES[key]
    return conn.execute(text("select id from role_definitions where community_id = :c and key = :k"), {"c": cid, "k": key}).first() or conn.execute(
        text("insert into role_definitions (community_id, key, name, can_manage) values (:c, :k, :n, :m) returning id"), {"c": cid, "k": key, "n": name, "m": manage}).one()


def seed_community(conn, c: dict) -> None:
    if conn.execute(text("select 1 from communities where slug = :s"), {"s": c["slug"]}).first():
        return
    now = datetime.now(timezone.utc)
    ids = []
    for name, area, band, _role_key in c["people"]:
        ids.append(conn.execute(text("insert into users (email, display_name, area_name, age_band) values (:e, :n, :a, :b) returning id"),
                                {"e": _handle(name, c["slug"]), "n": name, "a": area, "b": band}).one().id)
    cover, pictures = _photos(c["slug"], len(c["activities"]))
    address, interests = DETAILS[c["slug"]]
    cid = conn.execute(
        text("insert into communities (name, slug, kind, icon, description, area_name, address, interests, cover_url, privacy, invite_code, is_demo, created_by) values "
             "(:n, :s, :k, :i, :d, :a, :ad, cast(:it as text[]), :cv, 'open', :c, true, :u) returning id"),
        {"n": c["name"], "s": c["slug"], "k": c["kind"], "i": c["icon"], "d": c["desc"], "a": c["area"], "ad": address, "it": interests, "cv": cover, "c": c["code"], "u": ids[0]}).one().id
    for u in ids:
        conn.execute(text("insert into memberships (community_id, user_id) values (:c, :u)"), {"c": cid, "u": u})
    for (_n, _a, _b, role_key), user in zip(c["people"], ids):
        if role_key:
            d = _role(conn, cid, role_key).id
            conn.execute(text("insert into role_terms (community_id, role_definition_id, user_id, starts_on, ends_on) values (:c, :d, :u, :s, :e)"),
                         {"c": cid, "d": d, "u": user, "s": date.today() - timedelta(days=90), "e": date.today() + timedelta(days=275)})
    for title, body, pinned, who, days_ago in c["announcements"]:
        conn.execute(text("insert into announcements (community_id, author_id, title, body, pinned, created_at) values (:c, :a, :t, :b, :p, :d)"),
                     {"c": cid, "a": ids[who], "t": title, "b": body, "p": pinned, "d": now - timedelta(days=days_ago)})
    acts = []
    for n, (title, desc, cat, days, hours, place, cap) in enumerate(c["activities"]):
        start = now + timedelta(days=days, hours=2)
        acts.append(conn.execute(
            text("insert into activities (community_id, organiser_id, title, description, category, starts_at, ends_at, location, capacity, image_url) values "
                 "(:c, :o, :t, :d, :cat, :s, :e, :l, :cap, :img) returning id"),
            {"c": cid, "o": ids[3], "t": title, "d": desc, "cat": cat, "s": start, "e": start + timedelta(hours=hours), "l": place, "cap": cap,
             "img": pictures[n]}).one().id)
    for i, a in enumerate(acts):
        for u in ids[: 3 + i * 2]:
            conn.execute(text("insert into activity_participants (activity_id, user_id) values (:a, :u)"), {"a": a, "u": u})
    for who, kind, desc, hours in c["contributions"]:
        conn.execute(text("insert into contributions (community_id, user_id, kind, description, hours, verified_by) values (:c, :u, :k, :d, :h, :v)"),
                     {"c": cid, "u": ids[who], "k": kind, "d": desc, "h": hours, "v": ids[1]})
    for who, kind, title, desc, contact in c["opportunities"]:
        conn.execute(text("insert into opportunities (community_id, posted_by, kind, title, description, contact) values (:c, :u, :k, :t, :d, :ct)"),
                     {"c": cid, "u": ids[who], "k": kind, "t": title, "d": desc, "ct": contact})
    print(f"demo community created: {c['name']} (join code {c['code']}), {len(ids)} core members")


def fill(conn, cid, target: int, band_seed: int) -> None:
    """Brings the member count of a community up to `target` with demo people who have real Singapore names (shared across communities)."""
    have = conn.execute(text("select count(*) from memberships where community_id = :c and status = 'active'"), {"c": cid}).scalar_one()
    need = max(0, target - have)
    if not need:
        return
    for i, (name, email) in enumerate(real_people(400)):
        band = "60plus" if i % 4 else "40to59"  # three in four are seniors
        conn.execute(text("insert into users (email, display_name, area_name, age_band) values (:e, :n, 'Singapore', :b) on conflict (email) do nothing"), {"e": email, "n": name, "b": band})
    conn.execute(text("insert into memberships (community_id, user_id) select :c, u.id from users u where u.email like :d and u.area_name = 'Singapore' "
                      "and not exists (select 1 from memberships m where m.community_id = :c and m.user_id = u.id) order by md5(u.email || :x) limit :n"),
                 {"c": cid, "n": need, "d": f"%@{DOMAIN}", "x": str(band_seed)})


# Long-running efforts of each demo community: (title, one line, description, current plan, icon).
INITIATIVES = {
    "bedok-heritage-kakis-demo": [("Recipe Book Project", "Our grandmothers' recipes, written down", "Elders dictate, youth type and photograph. One recipe a week goes into a printed book.", "Collect 30 recipes by March", "restaurant-outline"),
                                  ("Old Photographs Archive", "Scan and name the faces", "Bring old family photos; volunteers scan them and members help name who is in them.", "Scan 200 photos this quarter", "images-outline")],
    "toa-payoh-silver-mentors-demo": [("CV Clinic", "Free CV help for job seekers", "Retired HR and hiring managers review CVs and practise interviews one-to-one.", "Help 40 people this year", "document-text-outline"),
                                      ("Reading Buddies", "Mentoring primary pupils", "A senior and a child read together for one hour a week.", "Pair 25 children by June", "book-outline")],
    "tampines-kampung-spirit-demo": [("Kampung Childcare Circle", "Grandparents mind children after school", "Trained senior members look after children for working parents, with a small fee that stays in the community.", "Open a second block by April", "happy-outline"),
                                     ("Morning Tai Chi", "Move together every morning", "A senior-led group exercise open to all ages.", "Reach 60 regular members", "body-outline")],
    "jurong-green-gardeners-demo": [("Green Campus", "Make our neighbourhood greener", "Community gardening, composting and recycling run by members.", "Plant 50 new trees this month", "leaf-outline"),
                                    ("Seed Library", "Share seeds, share harvests", "Swap seeds and cuttings at every planting morning.", "Stock 40 varieties", "flower-outline")],
}


def seed_initiatives(conn) -> None:
    """Idempotent: adds the demo initiatives (and a few comments and likes on the latest update) to demo communities that have none yet."""
    for slug, items in INITIATIVES.items():
        c = conn.execute(text("select id from communities where slug = :s"), {"s": slug}).first()
        if c is None or conn.execute(text("select 1 from initiatives where community_id = :c"), {"c": c.id}).first():
            continue
        people = [r.user_id for r in conn.execute(text("select user_id from memberships where community_id = :c and status = 'active' order by joined_at limit 12"), {"c": c.id}).all()]
        for title, summary, desc, plan, icon in items:
            i = conn.execute(text("insert into initiatives (community_id, created_by, title, summary, description, current_plan, icon) values (:c, :u, :t, :s, :d, :p, :i) returning id"),
                             {"c": c.id, "u": people[0], "t": title, "s": summary, "d": desc, "p": plan, "i": icon}).one().id
            for u in people[: 6 + len(title) % 5]:
                conn.execute(text("insert into initiative_members (initiative_id, user_id) values (:i, :u) on conflict do nothing"), {"i": i, "u": u})
        a = conn.execute(text("select id from announcements where community_id = :c order by created_at desc limit 1"), {"c": c.id}).first()
        if a:
            for u, body in zip(people[1:4], ["Great initiative, I will join.", "Thank you for organising this.", "Count me in, and I will bring a neighbour."]):
                conn.execute(text("insert into announcement_comments (announcement_id, user_id, body) values (:a, :u, :b)"), {"a": a.id, "u": u, "b": body})
            for u in people[:5]:
                conn.execute(text("insert into announcement_likes (announcement_id, user_id) values (:a, :u) on conflict do nothing"), {"a": a.id, "u": u})
    print("demo initiatives ready")


def enrich(conn) -> None:
    """Communities seeded before the address and interests existed get them now (only where still empty). Safe to run again."""
    for slug, (address, interests) in DETAILS.items():
        conn.execute(text("update communities set address = coalesce(address, :a), interests = case when interests = '{}' then cast(:i as text[]) else interests end where slug = :s"),
                     {"a": address, "i": interests, "s": slug})


def seed(extra_emails: list[str]) -> None:
    with engine().begin() as conn:
        for c in COMMUNITIES:
            seed_community(conn, c)
        enrich(conn)
        real = [e.strip().lower() for e in extra_emails]
        for n, c in enumerate(COMMUNITIES):
            cid = conn.execute(text("select id from communities where slug = :s"), {"s": c["slug"]}).one().id
            for i, e in enumerate(real if n < 3 else []):  # a person is in three communities at most: the fourth demo community is there to explore  # real accounts belong to all demo communities; the first one becomes Secretary so the manager view can be tried
                u = conn.execute(text("select id from users where email = :e"), {"e": e}).first()
                if not u:
                    if n == 0:
                        print(f"no account for {e}: sign in once first, then run this again")
                    continue
                conn.execute(text("insert into memberships (community_id, user_id) values (:c, :u) on conflict (community_id, user_id) do update set status = 'active'"), {"c": cid, "u": u.id})
                if i == 0:
                    d = _role(conn, cid, SECRETARY).id
                    if not conn.execute(text("select 1 from role_terms where community_id = :c and user_id = :u and role_definition_id = :d"), {"c": cid, "u": u.id, "d": d}).first():
                        conn.execute(text("insert into role_terms (community_id, role_definition_id, user_id, starts_on, ends_on) values (:c, :d, :u, current_date, current_date + interval '12 months')"),
                                     {"c": cid, "d": d, "u": u.id})
            fill(conn, cid, c["target"], n)
        seed_initiatives(conn)
        seed_market(conn)
        print("demo communities ready: " + ", ".join(f"{c['name']} {c['target']}" for c in COMMUNITIES) + " members (real accounts included)")


# Services the demo seniors offer in the Marketplace, with their experience and proof of work (demo data: the owners are demo people, removed by --reset).
LISTINGS = [
    ("Kueh and nyonya cooking lessons", "cooking", "skilled", 30, "Ran a kueh stall at Tekka Centre for 30 years.", 28, "Come to my kitchen or I come to yours. We make kueh lapis and ondeh-ondeh together."),
    ("Fixing small appliances and bicycles", "repair", "skilled", 25, "Electrician with a town council for 25 years.", 20, "Rice cookers, fans, bicycles and loose wires. I explain what I do so you can do it next time."),
    ("Business advice for small shops", "advice", "expert", 35, "Retail manager at a supermarket chain; trained more than 200 staff.", 45, "How to price, how to display, how to talk to customers. Good before a market day."),
    ("Hokkien and old Singapore stories for children", "storytelling", "basic", 40, "Retired primary school teacher; has told stories at the library for 10 years.", None, "Free for schools and community centres. Short sessions, with pictures."),
    ("Chinese calligraphy for beginners", "crafts", "skilled", 20, "Taught at a community club calligraphy class for 20 years.", 25, "Brush, ink and patience. Small groups of up to six."),
    ("Gentle tai chi for seniors", "wellness", "skilled", 15, "Certified instructor at a community club.", 22, "Slow movements, done sitting or standing. Good for balance."),
    ("Hand-sewn bags and cloth crafts", "crafts", "basic", 18, "Worked as a tailor for 18 years.", 15, "Learn to make a tote bag in one afternoon, or order one."),
]


def seed_market(conn) -> None:
    """A few services and one market-day event, so the Marketplace and the stalls can be tried. Safe to run again."""
    if conn.execute(text("select 1 from service_listings l join users u on u.id = l.owner_id where u.email like :d"), {"d": f"%@{DOMAIN}"}).first() is None:
        owners = conn.execute(
            text("select id, display_name, area_name from users where email like :d and age_band = '60plus' order by email limit :n"), {"d": f"%@{DOMAIN}", "n": len(LISTINGS)}).all()
        for o, (title, cat, tier, years, proof, rate, desc) in zip(owners, LISTINGS):
            conn.execute(
                text("insert into service_listings (owner_id, title, category, description, tier, experience_years, proof_text, rate_per_hour, area_name) values (:o, :t, :c, :d, :tier, :y, :p, :r, :a)"),
                {"o": o.id, "t": title, "c": cat, "d": desc, "tier": tier, "y": years, "p": proof, "r": rate, "a": o.area_name})
        print(f"marketplace: {min(len(owners), len(LISTINGS))} demo services")
    first = conn.execute(text("select id, created_by from communities where is_demo order by created_at limit 1")).first()
    if first and conn.execute(text("select 1 from activities where community_id = :c and lower(category) = 'market'"), {"c": first.id}).first() is None:
        conn.execute(
            text("insert into activities (community_id, organiser_id, title, description, category, starts_at, ends_at, location, capacity) values "
                 "(:c, :o, 'Sunday Market Day', 'Neighbours sell what they have made: kueh, cards, bags, crafts. Seniors run the stalls and bring a helper.', 'Market', now() + interval '5 days', now() + interval '5 days 4 hours', 'Void deck', 60)"),
            {"c": first.id, "o": first.created_by})
        print("market-day event created")


def main(argv: list[str]) -> None:
    if "--reset" in argv:
        with engine().begin() as conn:
            reset(conn)
        print("demo communities and demo people removed")
        return
    seed([a for a in argv if "@" in a])


if __name__ == "__main__":
    main(sys.argv[1:])
