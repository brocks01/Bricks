"""Seeds the Explore library: six categories, five short items each, written for people of any age (a 25-year-old, a 55-year-old and an 80-year-old).

  python backend/run.py seed-explore            # add the items (skips the ones already there, by title)
  python backend/run.py seed-explore --reset    # remove the seeded items again

These are ORIGINAL Bricks drafts, not copied from anywhere. They are marked reviewed_by = "Bricks draft, pending expert review" so they show in the app, but an
expert (a doctor for health, a bank for payments) must still check them before real launch. Health items are educational and never medical advice.
Everything is marked is_demo so --reset removes exactly these. Photos are direct Unsplash links already used for the demo communities; items without a
fitting photo have none and the app shows the category symbol instead."""
import json
import sys

from sqlalchemy import text

from .core.db import engine

SRC = "Original Bricks guide (draft)"
REVIEW = "Bricks draft, pending expert review"
G, V, I, S, A = "guide", "video", "interactive", "story", "activity"


def _img(photo: str) -> str:
    return f"https://images.unsplash.com/photo-{photo}?w=800&q=70&auto=format&fit=crop"


GARDEN, GARDEN2, HERITAGE, MENTOR = "1757585267523-f689c297fa2d", "1621460248083-6271cc4437a8", "1648365304143-9aa30adbf8e4", "1642413140777-0a3bf5ff39e5"

# category, format, level, title, summary, minutes, [what you will learn / steps], body, photo or None
ITEMS = [
    # Digital skills
    ("digital_skills", I, "easy", "Paying with UPI or PayNow, step by step", "Learn how a QR payment works and practise one safely, with demo money.", 8,
     ["Open your payment app", "Scan the shop's QR code", "Check the name and the amount", "Confirm with your PIN", "Look for the success message"],
     "A QR payment moves money from your bank account to the shop's. Always check the shop's name and the amount before you confirm. Never share your PIN or an OTP with anyone, not even someone who says they are from the bank.", MENTOR),
    ("digital_skills", G, "easy", "Video calling family: a first call", "Set up and make a video call to someone you love, in five steps.", 6,
     ["Open the calling app", "Pick the person", "Tap the camera button", "Hold the phone at eye level", "End the call with the red button"],
     "Sit where there is light in front of you, not behind. Hold the phone steady against something, like a stack of books. If the picture freezes, switch to a voice call and try again later.", None),
    ("digital_skills", G, "easy", "Spotting a scam message", "Five signs that a message or call is trying to trick you.", 7,
     ["It rushes you", "It asks for a PIN, OTP or password", "It promises a prize or a refund", "The link looks slightly wrong", "It asks you to keep it secret"],
     "A real bank, government office or shop will not ask for your OTP or PIN. If a message worries you, stop, do not click, and ring the organisation using the number printed on your card or the official website. Tell someone you trust.", None),
    ("digital_skills", G, "easy", "Finding your way with a maps app", "Search a place, see the route, and choose walking or bus.", 8,
     ["Open the maps app", "Type where you want to go", "Choose walk, bus or train", "Follow the blue line", "Share your live location with family"],
     "You can ask the app for directions to a clinic, a market or a friend's home. Choosing 'public transport' shows bus numbers and when the next one arrives.", None),
    ("digital_skills", G, "easy", "Making your phone easier to read", "Bigger letters, brighter screen and louder sound in a few taps.", 4,
     ["Open Settings", "Choose Display, then Text size", "Slide to the size you like", "Raise the volume and the screen brightness"],
     "These settings are yours to change and you cannot break anything. If you do not like a change, go back and slide it the other way.", None),
    # Health awareness
    ("health_awareness", G, "easy", "Understanding blood pressure numbers", "What the two numbers mean and why a regular check helps. Educational, not medical advice.", 6,
     ["The top number is pressure when the heart pushes", "The bottom number is pressure when it rests", "Measure sitting, calm, at the same time each day", "Write the numbers down and show your doctor"],
     "Blood pressure is written like 120 over 80. Many things change it, such as stress, salt, sleep and medicine, so one reading does not tell the whole story. Only a doctor can tell you what your numbers mean for you.", None),
    ("health_awareness", G, "easy", "Eating well with local food", "A balanced plate using food you already enjoy: more vegetables, less salt and sugar.", 7,
     ["Fill half the plate with vegetables", "Choose wholegrain rice or roti when you can", "Add a palm-sized portion of dal, fish, egg or tofu", "Go gently on salt, sugar and fried food"],
     "You do not need special food. Small swaps, like one more vegetable at lunch or less sugar in the tea, add up. If you have a condition such as diabetes, ask your doctor or a dietitian about your own plate.", None),
    ("health_awareness", G, "easy", "A good night's sleep", "Simple habits that help many people sleep better.", 5,
     ["Go to bed and wake at similar times", "Keep the room dark and cool", "Avoid tea or coffee late in the day", "Put the phone away an hour before bed"],
     "If you often cannot sleep, feel tired all day, or snore loudly and stop breathing, speak to a doctor. These tips are general and are not a treatment.", None),
    ("health_awareness", A, "easy", "Ten minutes of gentle movement", "A short, safe routine you can do in a chair or standing beside a wall.", 10,
     ["Roll your shoulders slowly", "Lift your heels, then your toes", "Stand up and sit down five times", "Walk on the spot for two minutes", "Breathe slowly and rest"],
     "Move at a pace where you can still talk. Stop if you feel pain, dizziness or breathlessness, and ask your doctor before starting if you are unsure.", None),
    ("health_awareness", G, "easy", "Feeling low? Small steps that can help", "Ways to look after your mind, and when to ask for help.", 6,
     ["Talk to one person today", "Go outside for fresh air", "Do something small you enjoy", "Ask for help early"],
     "Everyone feels low sometimes. If it lasts more than two weeks, or you feel hopeless, please speak to a doctor or a helpline. In Singapore you can call the Samaritans of Singapore on 1767; in India, Tele-MANAS on 14416.", None),
    # Everyday life
    ("everyday_life", G, "easy", "Checking your bank balance safely", "See your balance and recent payments without risk.", 6,
     ["Use only your bank's own app or website", "Sign in with your own PIN or fingerprint", "Look at the last few payments", "Sign out and close the app"],
     "Never sign in from a link in a message. Type the bank's address yourself or use the app you installed from the official store. If a payment looks wrong, call the bank at once.", None),
    ("everyday_life", G, "easy", "Planning a trip by bus and train", "Work out the route, the time and the cost before you leave home.", 8,
     ["Decide where and when", "Search the route in a maps app", "Check the first and last bus or train", "Carry a charged phone and some cash", "Tell someone your plan"],
     "Leave earlier than you think you need to. Know where you will wait and where you will sit. A travel card or a payment app saves finding change.", None),
    ("everyday_life", G, "easy", "Staying safe at home and outside", "Simple habits that lower the risk of a fall, a theft or a trick.", 7,
     ["Keep floors dry and clear of loose mats", "Light up the stairs and the bathroom", "Never let a stranger in without checking", "Keep important numbers by the phone"],
     "Most falls happen at home. Good light, non-slip shoes and a clear path help a great deal. Keep the numbers of family and a neighbour where you can see them.", None),
    ("everyday_life", G, "medium", "Reading a bill or a label", "Find the amount, the due date and what you are really paying for.", 6,
     ["Find the total and the due date", "Look for fees you did not expect", "Check the units, such as kilograms or litres", "Keep the bill until it is paid and checked"],
     "A label or bill is written to be read carefully. If something does not match what you were told, ask the seller or the company to explain it before you pay.", None),
    ("everyday_life", G, "easy", "Asking for help when something goes wrong", "Who to contact if you are cheated, lost, or a service fails you.", 5,
     ["Write down what happened and when", "Keep messages and receipts", "Contact the company first", "Then go to the consumer helpline or the police"],
     "Being cheated is not your fault and it can happen to anyone. The sooner you tell someone, the more can be done. Tell a family member or a community friend too.", None),
    # Hobbies and interests
    ("hobbies", A, "easy", "Start a small herb garden", "Grow mint, basil or coriander in a pot by a sunny window.", 15,
     ["Choose a pot with a hole in the bottom", "Fill it with potting soil", "Sow a few seeds or plant a cutting", "Water a little every day", "Pick leaves for your cooking"],
     "Herbs like light, so a window or balcony that gets sun for four to six hours is ideal. Water when the top of the soil feels dry. Start with one pot and add more when you enjoy it.", GARDEN),
    ("hobbies", A, "easy", "Try a new recipe from a neighbour", "Ask someone for a family recipe and cook it together.", 30,
     ["Ask a neighbour for a dish they love", "Write the steps down", "Cook it with them or for them", "Share it and add your own twist"],
     "Food is one of the best ways to share a story. Write the recipe in your own words and keep it; it may be treasured one day.", GARDEN2),
    ("hobbies", A, "easy", "Draw what you see from your window", "A simple pencil sketch needs only a pencil and some paper.", 20,
     ["Choose one thing, like a tree or a building", "Draw its big shape first", "Add the details slowly", "Do not rub out; just keep going"],
     "There is no wrong way to sketch. Do one a day for a week and look at the first and the last. Many people are surprised at how much they improve.", None),
    ("hobbies", A, "easy", "Listen and sing along", "Choose an old song you love and learn all the words again.", 10,
     ["Pick a song from your younger days", "Find the words", "Sing it once slowly", "Sing it with a friend or family member"],
     "Music brings memories back. Share the song with a grandchild and ask what they are listening to in return.", None),
    ("hobbies", G, "easy", "Taking better photos with your phone", "Light, steady hands and a closer look.", 6,
     ["Stand with the light behind you", "Hold the phone with both hands", "Tap the screen where you want focus", "Move closer to your subject"],
     "Good photos often come from patience, not from an expensive camera. Photograph things you will want to remember.", None),
    # Culture and discovery
    ("culture", S, "easy", "Kampung days: stories of old neighbourhoods", "How people lived, shared and celebrated before high-rise estates.", 8,
     ["Ask an older neighbour about their first home", "Listen for the sounds and smells they remember", "Write down one story"],
     "Many of today's grandparents grew up in kampungs, where doors stayed open and neighbours looked after one another's children. Asking them about it is a gift to both of you.", HERITAGE),
    ("culture", G, "easy", "Festivals around us", "A short look at how Deepavali, Hari Raya, Chinese New Year, Pongal and Durga Puja are celebrated.", 8,
     ["Learn the meaning of each festival", "Notice the food, clothes and songs", "Invite a neighbour to share theirs"],
     "Each festival tells a story about hope, harvest, family or thanks. Visiting a neighbour's celebration, with respect and curiosity, is a good way to learn.", None),
    ("culture", S, "easy", "Folk tales to read aloud", "Short tales from India and Southeast Asia that grandchildren enjoy.", 10,
     ["Pick a tale you remember", "Read it aloud with different voices", "Ask the listener what happens next"],
     "Folk tales were made to be spoken. Try telling one without the book and see how the story changes with each telling.", None),
    ("culture", G, "easy", "A heritage walk near you", "Choose a street or a temple, mosque, church or market and look closely.", 20,
     ["Choose a place within walking distance", "Look for the oldest building", "Ask someone who has lived there long", "Take a photo or draw it"],
     "Every neighbourhood has a history. A short, slow walk with a notebook turns a familiar place into a new one.", HERITAGE),
    ("culture", G, "easy", "Learning a few words of another language", "Greet a neighbour in Tamil, Malay, Mandarin, Hindi or Bengali.", 6,
     ["Learn hello and thank you", "Say them to someone this week", "Learn one more word each day"],
     "Even a few words shown with a smile make people feel welcome. Do not worry about mistakes; people are usually delighted that you tried.", None),
    # Knowledge and curiosity
    ("knowledge", G, "easy", "Why the Moon changes shape", "A simple way to see how the Sun lights the Moon.", 6,
     ["Hold a ball in front of a lamp in a dark room", "Turn slowly and watch the lit part change", "Look at the real Moon tonight"],
     "The Moon is always half lit by the Sun. What changes is how much of the lit half we can see from Earth as the Moon moves around us in about a month.", None),
    ("knowledge", G, "easy", "How rain is made", "Water goes up, cools and falls: the water cycle in five steps.", 5,
     ["The sun warms water in seas and rivers", "Water rises as vapour", "It cools and forms clouds", "Drops grow heavy and fall as rain"],
     "The same water has been going round for millions of years. The rain that falls on your street may once have been part of a distant ocean.", None),
    ("knowledge", G, "easy", "Where your food comes from", "Follow rice, vegetables or fish from the field or sea to your plate.", 7,
     ["Pick one food you ate today", "Find where it was grown or caught", "Think about who carried and sold it"],
     "A single meal is the work of many people. Knowing this can change how you shop and how much you waste.", GARDEN),
    ("knowledge", G, "medium", "What is artificial intelligence?", "A plain explanation of the smart helpers in phones and websites.", 8,
     ["It finds patterns in lots of examples", "It can be wrong, so check what matters", "Never share your PIN or OTP with it", "You decide; it only helps"],
     "Tools that talk or answer questions have learned from very large amounts of writing. They are helpful for ideas and explanations, but they can make mistakes, so check important facts with a person or a trusted source.", None),
    ("knowledge", G, "easy", "A short history of the place you live", "Find out who lived here before and what the land was used for.", 10,
     ["Ask the oldest neighbour you know", "Look at old photos or maps online", "Write three things that surprised you"],
     "Libraries, community centres and the National Archives have photos and maps of old neighbourhoods. Sharing what you find with others is a good activity for a community.", MENTOR),
]


def main(args: list[str]) -> None:
    with engine().begin() as conn:
        if "--reset" in args:
            n = conn.execute(text("delete from explore_items where is_demo")).rowcount
            print(f"removed {n} seeded Explore items")
            return
        added = 0
        for cat, fmt, level, title, summary, minutes, steps, body, photo in ITEMS:
            if conn.execute(text("select 1 from explore_items where title = :t and is_demo"), {"t": title}).first():
                continue
            conn.execute(
                text("insert into explore_items (category_id, format, level, title, summary, steps, body, image_url, minutes, source, reviewed_by, is_demo) "
                     "values (:c, :f, :l, :t, :s, cast(:st as jsonb), :b, :i, :m, :src, :r, true)"),
                {"c": cat, "f": fmt, "l": level, "t": title, "s": summary, "st": json.dumps(steps), "b": body, "i": _img(photo) if photo else None, "m": minutes, "src": SRC, "r": REVIEW},
            )
            added += 1
        print(f"added {added} Explore items ({len(ITEMS)} in the library)")


if __name__ == "__main__":
    main(sys.argv[1:])
