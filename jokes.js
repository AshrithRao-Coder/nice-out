/* ==========================================================================
   THE JOKES  —  210 of them.

   The app picks by condition, then rotates through the list using the week
   number, so you get a different set every week. Roughly 14 weeks before
   any line repeats.

   WANT TO WRITE YOUR OWN? Just add lines to any list. No limit. Keep the
   quotes and the comma at the end and you can't break it.
   ========================================================================== */

const JOKES = {

  thunder: [
    "Thunder today. The sky is moving furniture around.",
    "Storms. Excellent window weather, terrible everything-else weather.",
    "Thunder and lightning. Nature showing off again.",
    "The sky is in a mood and wants everyone to know.",
    "Big rumbly sky. Count the seconds after the flash — that's how far away it is.",
    "Storms later. Charge your phone now, not when the lights flicker.",
    "Thunder. Somewhere, a dog is having the worst day of its life.",
    "Loud sky. Stay off the football pitch, genuinely.",
    "Thunderstorms. Free light show, terrible seats.",
    "The clouds have got beef with each other.",
    "Lightning about. Impressive from a window, less so from a field.",
    "Storm brewing. Everything smells strange just before it starts — that's real.",
    "Rumbling all day. The sky's stomach needs sorting out.",
    "Thunder. Nothing you own is waterproof enough for this."
  ],

  snow: [
    "Snow! Check whether school's actually shut before getting excited.",
    "Gloves. Don't pretend you don't need them.",
    "It's snowing. Everything takes twice as long and looks twice as good.",
    "Snow day potential: high. Homework excuse quality: medium.",
    "Snow. Wear the boots, not the trainers you like.",
    "White stuff falling. Build something before it melts.",
    "Snowing. The whole country will now forget how to drive.",
    "Snow today. Your fingers will regret the snowball fight in about ten minutes.",
    "It's settling. The good kind — the kind that sticks.",
    "Snow. Objectively the best weather and I won't be debating it.",
    "Flakes incoming. Stick your tongue out at your own risk.",
    "Snow. Everything is silent and slightly magic for about six hours.",
    "Snowing. Two hours of joy, then it goes brown and sad.",
    "Wrap up properly. This is not a fashion day."
  ],

  heavyRain: [
    "This isn't rain, it's a car wash with no car.",
    "Absolutely bucketing it. Stay in. Read something.",
    "Heavy rain. Your socks are already doomed, they just don't know yet.",
    "The sky has fully let go. Nothing you wear will help.",
    "Torrential. Umbrellas are decorative at this point.",
    "Serious rain. Puddles with ambitions of becoming lakes.",
    "It's hammering down. Even the ducks have concerns.",
    "Proper downpour. Everything outside is now a water feature.",
    "Rain so heavy it's basically a pressure wash of the entire county.",
    "Big rain. Big, loud, unreasonable rain.",
    "The sky is emptying itself. Cancel things.",
    "Drenching stuff. Waterproof means 'slightly slower to soak'.",
    "Rain like someone's holding the sky upside down.",
    "Absolutely biblical. Consider a boat."
  ],

  rain: [
    "Umbrella weather. The sky has plans and they involve you being wet.",
    "Take the umbrella. Yes, actually take it.",
    "Consider this your official hair warning.",
    "Rain today. Hood up, head down, get on with it.",
    "It'll rain. Not dramatically, just persistently and annoyingly.",
    "Wet one. The kind that gets in your shoes somehow.",
    "Rain. The pavement will smell great, that's the one upside.",
    "Bring a coat with a hood. The hood is the whole point.",
    "Raining. Your trampoline is now a very large bowl.",
    "Rain today, so the grass gets a drink and you get damp. Fair trade.",
    "Umbrella in the bag. Don't be the person doing the fast wet walk.",
    "It's raining. Everyone will talk about it. Nobody will do anything about it.",
    "Rain. The washing outside is a lost cause now.",
    "Wet day. Perfect weather for staying in and building something."
  ],

  drizzle: [
    "Annoying half-rain. Not worth an umbrella, still soaks you.",
    "Drizzle. The weather can't commit and neither should you.",
    "Light drizzle — the sky sort of sneezing.",
    "It's doing that thing where it isn't quite raining but you're wet.",
    "Drizzle. The most passive-aggressive weather there is.",
    "Barely rain. Mostly just damp air with opinions.",
    "Spitting. Not enough to hide from, enough to ruin your hair.",
    "Fine drizzle. You'll only notice after twenty minutes, when you're soaked.",
    "The sky is misting you like a supermarket vegetable.",
    "Drizzle all day. Grey, damp, deeply unspectacular.",
    "Half-hearted rain from a half-hearted sky.",
    "Drizzling. Umbrella feels dramatic, no umbrella feels foolish. Classic.",
    "Wet air. Technically weather, barely.",
    "Light drizzle. Britain's default setting."
  ],

  fog: [
    "Fog. Anything more than 50 metres away has been cancelled.",
    "Foggy. The world has been reduced to just your bit of it.",
    "Mysterious, if you squint. Damp, if you don't.",
    "Fog today. Everything looks like the start of a film.",
    "Thick fog. Be visible — wear something a driver can actually see.",
    "The sky has come down to ground level for a look around.",
    "Fog. You can't see the end of the street and neither can anyone else.",
    "Low cloud, basically. You're standing inside a cloud. That's quite cool.",
    "Foggy. Sounds travel strangely. Everything feels closer.",
    "Murky out. The far distance has been temporarily removed.",
    "Fog. Great for atmosphere, bad for finding things.",
    "You'll hear the birds before you see them today.",
    "Grey soup. Take it slow crossing roads.",
    "Fog in. The horizon is off today."
  ],

  windy: [
    "Wind strong enough to restyle your hair for free.",
    "Very windy. Hold onto anything that matters.",
    "Walking one way will be great, the other way much less so.",
    "Gusty. Bins across the country are making a break for it.",
    "Windy. Your umbrella will be turned inside out and humiliated.",
    "Big wind. The trees are doing that worrying bendy thing.",
    "Blustery. Hood up and it'll still find your ears.",
    "Wind today. Anything not nailed down is now a projectile.",
    "Howling out there. Great for kites, bad for hairstyles.",
    "Gales. You'll arrive somewhere looking like you fought a badger.",
    "Wind so strong it's basically pushing you where it wants you to go.",
    "Windy. Trampolines nationwide are attempting flight.",
    "Hold your hat. Genuinely, hold it.",
    "Strong gusts. Walking will feel like a disagreement."
  ],

  hot: [
    "Genuinely hot. Sun cream, and I'm not taking questions.",
    "Roasting. Water bottle. Shade. Go on.",
    "Hot enough that shade becomes a competitive sport.",
    "Properly warm. Drink more water than you think you need.",
    "Baking. Everything metal outside is now a weapon.",
    "Hot. The pavement will be unpleasant for dog paws — think about that.",
    "Scorching. Hat, water, shade, repeat.",
    "It's a lot. Find a tree and stay under it.",
    "Very hot. Ice lolly is not a treat today, it's equipment.",
    "Hot one. Everyone will say 'it's not the heat, it's the humidity'. Ignore them.",
    "Boiling. Curtains shut in the morning keeps the house cooler — actually works.",
    "Hot enough to make doing anything feel like a bad idea.",
    "Sun's fully committed today. Cover up.",
    "Heat. Your phone might complain before you do."
  ],

  warm: [
    "Warm enough for shorts. Bold choice, but valid.",
    "Properly nice. Go outside and be smug about it.",
    "Lovely. Suspiciously lovely. Enjoy it while it lasts.",
    "Warm and pleasant. Almost nothing to complain about, which is unsettling.",
    "Good day for being outdoors doing basically anything.",
    "Warm. T-shirt weather with a jumper in the bag for later.",
    "Genuinely nice out. This is the weather people move here hoping for.",
    "Lovely and warm. Someone will say 'make the most of it'. They're right.",
    "Sunny and warm. Do not waste this indoors.",
    "Great weather. Sun cream still applies even when it's not roasting.",
    "Warm day. Ice cream is scientifically justified.",
    "Nice one. The sort of day you remember in November.",
    "Warm and bright. Everything looks better in this light.",
    "Proper good day. Go and do something outside."
  ],

  mild: [
    "Blue sky, no drama. Just go outside.",
    "Perfectly fine. Boring, but fine, and fine is underrated.",
    "Decent weather doing absolutely nothing wrong.",
    "Mild. The weather equivalent of a shrug, in a good way.",
    "Nothing to plan around today. Rare and quite nice.",
    "Pleasant. Not exciting. Sometimes that's the win.",
    "Fine out. No excuses available.",
    "Mild and calm. Ideal for a walk you'll pretend you didn't enjoy.",
    "Comfortable. Jumper on, jumper off, jumper on. You know the drill.",
    "Reasonable weather. The sky is having an average day.",
    "Neither hot nor cold. The weather is refusing to pick a side.",
    "Fine and mild. Go outside before it changes its mind.",
    "Middle-of-the-road weather. Take the free win.",
    "Quietly decent out. No notes."
  ],

  chilly: [
    "Bit nippy. Bring a jumper you'll pretend you didn't need.",
    "Chilly. Not coat-chilly. Jumper-chilly. There's a difference.",
    "Cool out. Your ears will notice before you do.",
    "Crisp. That's the polite word for it.",
    "Slightly cold. The kind where you warm up after ten minutes of walking.",
    "Fresh out there. Bracing, if you're feeling generous.",
    "Cool enough that hands go in pockets automatically.",
    "Chilly morning, better afternoon. Layers are the answer.",
    "Nippy. Not a disaster, just a jumper situation.",
    "Cool air. Deep breath outside will feel quite good actually.",
    "Bit cold. The sort of day for a hot drink you don't really need.",
    "Chilly. Someone will say it's 'refreshing'. They're lying.",
    "Cooler than it looks out the window. It always is.",
    "Light cold. Grab a layer on your way out."
  ],

  cold: [
    "Cold. Your fingers will be filing a complaint.",
    "Coat weather. Actual coat, not 'hoodie and hope'.",
    "Properly cold. Every layer you own has been summoned.",
    "Cold out. Your nose goes first, then your ears, then your resolve.",
    "Big coat day. No negotiation.",
    "Cold enough to see your breath and feel briefly like a dragon.",
    "Chilly to the bone. Hat helps more than you'd think.",
    "Cold. The five-minute walk will feel like fifteen.",
    "Bitter out. Warm socks are the unsung hero here.",
    "Cold day. Hot chocolate is now medically indicated.",
    "Wrap up. Properly, not decoratively.",
    "Cold. Door handles will be unpleasant.",
    "Really quite cold. Gloves live in the coat pocket for a reason.",
    "Cold out there. Radiator will be very popular later."
  ],

  freezing: [
    "Below zero. This is not a hoodie situation.",
    "Freezing. Ice on things. Careful on the way out.",
    "Genuinely freezing. Gloves are non-negotiable.",
    "Sub-zero. Everything crunches when you step on it.",
    "Ice day. Watch the paths, especially the ones in shade.",
    "Freezing cold. Exposed skin is a bad plan.",
    "Frost everywhere. Beautiful, treacherous.",
    "Below freezing. Car windscreens across the land are having a moment.",
    "Cold enough to hurt. Cover your ears and face.",
    "Icy. Walk like a penguin — small steps, actually works.",
    "Properly freezing. Puddles are now solid.",
    "Deep cold. Two pairs of socks is not excessive today.",
    "Freezing. Everything you touch outside will bite back.",
    "Ice. Slow down on corners and stairs."
  ],

  cloudy: [
    "Grey. Aggressively, committedly grey.",
    "The sky forgot to pick an outfit.",
    "Overcast all day. The sun's clocked off early.",
    "Cloudy. Flat light, no shadows, no drama.",
    "Full cloud. The sky is one colour and that colour is 'meh'.",
    "Grey out. Not raining though, which counts for something.",
    "Cloudy. Perfect weather for absolutely nothing in particular.",
    "Overcast. The sun is up there somewhere, allegedly.",
    "Grey lid on the whole sky today.",
    "Cloud cover throughout. At least you won't squint.",
    "Dull. In the meteorological sense and the general sense.",
    "Grey but dry. Take the dry, ignore the grey.",
    "Cloudy all day. The sky's screensaver is on.",
    "Overcast. Good light for photos, oddly enough."
  ],

  clearNight: [
    "Clear night — good for stars, if you can be bothered.",
    "Cloudless and dark. The sky's showing its whole hand.",
    "Clear tonight. Worth looking up at least once.",
    "No cloud. Go outside, let your eyes adjust for five minutes, look up.",
    "Good stargazing. Get away from streetlights if you can.",
    "Clear and dark. You'll see satellites if you watch long enough.",
    "Crisp clear night. Cold, but worth stepping outside for.",
    "Sky's wide open tonight. Genuinely worth two minutes of your time.",
    "Clear night. Find the three stars in a row — that's Orion's belt.",
    "Dark and cloudless. The moon will be doing its thing.",
    "Great night sky. Phone cameras can't do it justice, so just look.",
    "Clear above. Quiet, cold, and quite good.",
    "No clouds tonight. Lucky.",
    "Clear skies after dark. Look up before bed."
  ]
};

/* how many lines we've got, for the About panel */
JOKES._count = Object.keys(JOKES).reduce(
  (n, k) => n + (Array.isArray(JOKES[k]) ? JOKES[k].length : 0), 0
);
