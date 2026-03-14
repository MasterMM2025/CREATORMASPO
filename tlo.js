(() => {
  const PRESETS = [
    { id: "zinc-soft", name: "Zinc Soft", direction: "diagonal", stops: ["#ADA996", "#F2F2F2", "#DBDBDB", "#EAEAEA"] },
    { id: "mint-fresh", name: "Mint Fresh", direction: "horizontal", stops: ["#134E5E", "#71B280"] },
    { id: "skyline", name: "Skyline", direction: "diagonal", stops: ["#1e3c72", "#2a5298"] },
    { id: "apricot", name: "Apricot", direction: "horizontal", stops: ["#F09819", "#EDDE5D"] },
    { id: "ember", name: "Ember", direction: "diagonal", stops: ["#8E0E00", "#1F1C18"] },
    { id: "frost", name: "Frost", direction: "vertical", stops: ["#E0EAFC", "#CFDEF3"] },
    { id: "blue-raspberry", name: "Blue Raspberry", direction: "horizontal", stops: ["#00B4DB", "#0083B0"] },
    { id: "purple-dream", name: "Purple Dream", direction: "diagonal", stops: ["#bf5ae0", "#a811da"] },
    { id: "sunset-vibes", name: "Sunset Vibes", direction: "horizontal", stops: ["#ee0979", "#ff6a00"] },
    { id: "soft-lilac", name: "Soft Lilac", direction: "vertical", stops: ["#EECDA3", "#EF629F"] },
    { id: "midnight-city", name: "Midnight City", direction: "diagonal", stops: ["#232526", "#414345"] },
    { id: "fresh-mint", name: "Fresh Mint", direction: "horizontal", stops: ["#76b852", "#8DC26F"] },
    { id: "ice-coffee", name: "Ice Coffee", direction: "horizontal", stops: ["#403B4A", "#E7E9BB"] },
    { id: "rose-water", name: "Rose Water", direction: "vertical", stops: ["#E55D87", "#5FC3E4"] },
    { id: "deep-space", name: "Deep Space", direction: "diagonal", stops: ["#000000", "#434343"] },
    { id: "sea-bliss", name: "Sea Bliss", direction: "horizontal", stops: ["#2193b0", "#6dd5ed"] },
    { id: "forest-glow", name: "Forest Glow", direction: "diagonal", stops: ["#5A3F37", "#2C7744"] },
    { id: "candy-sky", name: "Candy Sky", direction: "horizontal", stops: ["#D3959B", "#BFE6BA"] },
    { id: "aqua-marine", name: "Aqua Marine", direction: "vertical", stops: ["#1A2980", "#26D0CE"] },
    { id: "coral-pop", name: "Coral Pop", direction: "horizontal", stops: ["#ff9966", "#ff5e62"] },
    { id: "peach-milk", name: "Peach Milk", direction: "vertical", stops: ["#ED4264", "#FFEDBC"] },
    { id: "graphite-steel", name: "Graphite Steel", direction: "diagonal", stops: ["#606c88", "#3f4c6b"] },
    { id: "winter-neva", name: "Winter Neva", direction: "horizontal", stops: ["#a1c4fd", "#c2e9fb"] },
    { id: "petrol-night", name: "Petrol Night", direction: "diagonal", stops: ["#0F2027", "#203A43", "#2C5364"] },
    { id: "orange-juice", name: "Orange Juice", direction: "horizontal", stops: ["#fc4a1a", "#f7b733"] },
    { id: "violet-mist", name: "Violet Mist", direction: "vertical", stops: ["#4776E6", "#8E54E9"] },
    { id: "mint-cream", name: "Mint Cream", direction: "horizontal", stops: ["#11998e", "#38ef7d"] },
    { id: "strawberry-wine", name: "Strawberry Wine", direction: "diagonal", stops: ["#C02425", "#F0CB35"] },
    { id: "ash", name: "Ash", direction: "horizontal", stops: ["#606c88", "#3f4c6b"] },
    { id: "lavender-sugar", name: "Lavender Sugar", direction: "vertical", stops: ["#DAE2F8", "#D6A4A4"] },
    { id: "bright-purple", name: "Bright Purple", direction: "horizontal", stops: ["#41295a", "#2F0743"] },
    { id: "juicy-green", name: "Juicy Green", direction: "diagonal", stops: ["#56ab2f", "#a8e063"] },
    { id: "mango-pulp", name: "Mango Pulp", direction: "horizontal", stops: ["#F09819", "#EDDE5D"] },
    { id: "soft-blue", name: "Soft Blue", direction: "vertical", stops: ["#BBD2C5", "#536976", "#292E49"] },
    { id: "radioactive-heat", name: "Radioactive Heat", direction: "horizontal", stops: ["#F7941E", "#72C6EF", "#00A651"] },
    { id: "dusty-grass", name: "Dusty Grass", direction: "diagonal", stops: ["#d4fc79", "#96e6a1"] },
    { id: "royal-blue", name: "Royal Blue", direction: "horizontal", stops: ["#536976", "#292E49"] },
    { id: "pink-fusion", name: "Pink Fusion", direction: "vertical", stops: ["#fc466b", "#3f5efb"] },
    { id: "bloody-mary", name: "Bloody Mary", direction: "horizontal", stops: ["#FF512F", "#DD2476"] },
    { id: "sunkist", name: "Sunkist", direction: "horizontal", stops: ["#F2994A", "#F2C94C"] },
    { id: "mirage", name: "Mirage", direction: "diagonal", stops: ["#16222A", "#3A6073"] },
    { id: "green-beach", name: "Green Beach", direction: "horizontal", stops: ["#02AAB0", "#00CDAC"] },
    { id: "pineapple", name: "Pineapple", direction: "vertical", stops: ["#FDC830", "#F37335"] },
    { id: "crystal-river", name: "Crystal River", direction: "horizontal", stops: ["#22c1c3", "#fdbb2d"] },
    { id: "blue-lagoon", name: "Blue Lagoon", direction: "diagonal", stops: ["#43C6AC", "#191654"] },
    { id: "harvey", name: "Harvey", direction: "horizontal", stops: ["#1f4037", "#99f2c8"] },
    { id: "atlas", name: "Atlas", direction: "vertical", stops: ["#FEAC5E", "#C779D0", "#4BC0C8"] },
    { id: "soundcloud", name: "Soundcloud", direction: "horizontal", stops: ["#fe8c00", "#f83600"] },
    { id: "lush", name: "Lush", direction: "diagonal", stops: ["#56ab2f", "#a8e063"] },
    { id: "argon", name: "Argon", direction: "horizontal", stops: ["#03001e", "#7303c0", "#ec38bc", "#fdeff9"] },
    { id: "celestial", name: "Celestial", direction: "vertical", stops: ["#C33764", "#1D2671"] },
    { id: "flare", name: "Flare", direction: "horizontal", stops: ["#f12711", "#f5af19"] },
    { id: "mega-tron", name: "Mega Tron", direction: "diagonal", stops: ["#C6FFDD", "#FBD786", "#f7797d"] },
    { id: "moonlit", name: "Moonlit", direction: "horizontal", stops: ["#0F2027", "#203A43", "#2C5364"] },
    { id: "ohhappiness", name: "Ohhappiness", direction: "horizontal", stops: ["#00b09b", "#96c93d"] },
    { id: "rainy-ashville", name: "Rainy Ashville", direction: "vertical", stops: ["#fbc2eb", "#a6c1ee"] },
    { id: "light-orange", name: "Light Orange", direction: "horizontal", stops: ["#FFB75E", "#ED8F03"] },
    { id: "piglet", name: "Piglet", direction: "diagonal", stops: ["#ee9ca7", "#ffdde1"] },
    { id: "witching-hour", name: "Witching Hour", direction: "horizontal", stops: ["#c31432", "#240b36"] },
    { id: "cool-sky", name: "Cool Sky", direction: "vertical", stops: ["#2980B9", "#6DD5FA", "#FFFFFF"] },
    { id: "red-salvation", name: "Red Salvation", direction: "horizontal", stops: ["#f85032", "#e73827"] },
    { id: "tranquil", name: "Tranquil", direction: "horizontal", stops: ["#EECDA3", "#EF629F"] },
    { id: "shifter", name: "Shifter", direction: "diagonal", stops: ["#bc4e9c", "#f80759"] },
    { id: "sublime-light", name: "Sublime Light", direction: "horizontal", stops: ["#FC5C7D", "#6A82FB"] },
    { id: "telegram", name: "Telegram", direction: "vertical", stops: ["#1c92d2", "#f2fcfe"] },
    { id: "relay", name: "Relay", direction: "horizontal", stops: ["#3A1C71", "#D76D77", "#FFAF7B"] },
    { id: "venice-blue", name: "Venice Blue", direction: "horizontal", stops: ["#085078", "#85D8CE"] },
    { id: "kashmir", name: "Kashmir", direction: "diagonal", stops: ["#614385", "#516395"] },
    { id: "dawn", name: "Dawn", direction: "horizontal", stops: ["#F3904F", "#3B4371"] },
    { id: "ibiza-sunrise", name: "Ibiza Sunrise", direction: "horizontal", stops: ["#ee0979", "#ff6a00"] },
    { id: "sky-glider", name: "Sky Glider", direction: "vertical", stops: ["#00c6ff", "#0072ff"] },
    { id: "pale-wood", name: "Pale Wood", direction: "horizontal", stops: ["#eacda3", "#d6ae7b"] },
    { id: "sweet-morning", name: "Sweet Morning", direction: "diagonal", stops: ["#FF5F6D", "#FFC371"] },
    { id: "scooter", name: "Scooter", direction: "horizontal", stops: ["#36D1DC", "#5B86E5"] },
    { id: "yoda", name: "Yoda", direction: "horizontal", stops: ["#FF0099", "#493240"] },
    { id: "pastel-red", name: "Pastel Red", direction: "vertical", stops: ["#ffdde1", "#ee9ca7"] },
    { id: "blue-steel", name: "Blue Steel", direction: "horizontal", stops: ["#4b6cb7", "#182848"] },
    { id: "socialive", name: "Socialive", direction: "diagonal", stops: ["#06beb6", "#48b1bf"] },
    { id: "sin-city-red", name: "Sin City Red", direction: "horizontal", stops: ["#ED213A", "#93291E"] },
    { id: "timber", name: "Timber", direction: "horizontal", stops: ["#fc00ff", "#00dbde"] },
    { id: "friday", name: "Friday", direction: "vertical", stops: ["#83a4d4", "#b6fbff"] },
    { id: "jshine", name: "JShine", direction: "horizontal", stops: ["#12c2e9", "#c471ed", "#f64f59"] },
    { id: "reef", name: "Reef", direction: "horizontal", stops: ["#00d2ff", "#3a7bd5"] },
    { id: "dance-to-forget", name: "Dance To Forget", direction: "diagonal", stops: ["#FF4E50", "#F9D423"] },
    { id: "parklife", name: "Parklife", direction: "horizontal", stops: ["#ADD100", "#7B920A"] },
    { id: "starfall", name: "Starfall", direction: "horizontal", stops: ["#F0C27B", "#4B1248"] },
    { id: "endless-river", name: "Endless River", direction: "vertical", stops: ["#43cea2", "#185a9d"] },
    { id: "hydrogen", name: "Hydrogen", direction: "horizontal", stops: ["#667db6", "#0082c8", "#0082c8", "#667db6"] },
    { id: "orange-fun", name: "Orange Fun", direction: "diagonal", stops: ["#fc4a1a", "#f7b733"] },
    { id: "love-couple", name: "Love Couple", direction: "horizontal", stops: ["#3a6186", "#89253e"] },
    { id: "burning-orange", name: "Burning Orange", direction: "horizontal", stops: ["#FF416C", "#FF4B2B"] },
    { id: "azure-lane", name: "Azure Lane", direction: "vertical", stops: ["#7F7FD5", "#86A8E7", "#91EAE4"] },
    { id: "royal", name: "Royal", direction: "horizontal", stops: ["#141E30", "#243B55"] },
    { id: "lunar-purple", name: "Lunar Purple", direction: "diagonal", stops: ["#834d9b", "#d04ed6"] },
    { id: "meridian", name: "Meridian", direction: "horizontal", stops: ["#283c86", "#45a247"] },
    { id: "subu", name: "Subu", direction: "horizontal", stops: ["#0cebeb", "#20e3b2", "#29ffc6"] },
    { id: "wiretap", name: "Wiretap", direction: "vertical", stops: ["#8A2387", "#E94057", "#F27121"] },
    { id: "amethyst", name: "Amethyst", direction: "horizontal", stops: ["#9D50BB", "#6E48AA"] },
    { id: "rainbow-blue", name: "Rainbow Blue", direction: "horizontal", stops: ["#00F260", "#0575E6"] },
    { id: "green-blue", name: "Green Blue", direction: "diagonal", stops: ["#00C9A7", "#92FE9D"] },
    { id: "blooker20", name: "Blooker20", direction: "horizontal", stops: ["#e65c00", "#F9D423"] },
    { id: "charlottesville", name: "Charlottesville", direction: "horizontal", stops: ["#614385", "#516395"] },
    { id: "azure-pop", name: "Azure Pop", direction: "vertical", stops: ["#6a11cb", "#2575fc"] },
    { id: "sherbert", name: "Sherbert", direction: "horizontal", stops: ["#f79d00", "#64f38c"] },
    { id: "mauve", name: "Mauve", direction: "horizontal", stops: ["#42275a", "#734b6d"] },
    { id: "servquick", name: "Servquick", direction: "diagonal", stops: ["#485563", "#29323c"] },
    { id: "flickr", name: "Flickr", direction: "horizontal", stops: ["#ff0084", "#33001b"] },
    { id: "curiosity-blue", name: "Curiosity Blue", direction: "horizontal", stops: ["#525252", "#3d72b4"] },
    { id: "ultra-violet", name: "Ultra Violet", direction: "vertical", stops: ["#654ea3", "#eaafc8"] },
    { id: "grade-grey", name: "Grade Grey", direction: "horizontal", stops: ["#bdc3c7", "#2c3e50"] },
    { id: "ali", name: "Ali", direction: "horizontal", stops: ["#ff4b1f", "#1fddff"] },
    { id: "black-rose", name: "Black Rose", direction: "diagonal", stops: ["#f4c4f3", "#fc67fa"] },
    { id: "compass", name: "Compass", direction: "horizontal", stops: ["#516395", "#614385"] },
    { id: "tea-cup", name: "Tea Cup", direction: "horizontal", stops: ["#076585", "#fff"] },
    { id: "netflix", name: "Netflix", direction: "vertical", stops: ["#8E0E00", "#1F1C18"] },
    { id: "emerald-water", name: "Emerald Water", direction: "horizontal", stops: ["#348F50", "#56B4D3"] },
    { id: "limeade", name: "Limeade", direction: "horizontal", stops: ["#A1FFCE", "#FAFFD1"] },
    { id: "instagram", name: "Instagram", direction: "diagonal", stops: ["#833ab4", "#fd1d1d", "#fcb045"] },
    { id: "telegram-blue", name: "Telegram Blue", direction: "horizontal", stops: ["#1c92d2", "#f2fcfe"] },
    { id: "icy-pop", name: "Icy Pop", direction: "vertical", stops: ["#a8c0ff", "#3f2b96"] },
    { id: "sunny-morning", name: "Sunny Morning", direction: "horizontal", stops: ["#f6d365", "#fda085"] },
    { id: "night-fade", name: "Night Fade", direction: "horizontal", stops: ["#a18cd1", "#fbc2eb"] },
    { id: "spring-warmth", name: "Spring Warmth", direction: "diagonal", stops: ["#fad0c4", "#ffd1ff"] },
    { id: "juicy-peach", name: "Juicy Peach", direction: "horizontal", stops: ["#ffecd2", "#fcb69f"] },
    { id: "young-passion", name: "Young Passion", direction: "horizontal", stops: ["#ff8177", "#ff867a", "#ff8c7f", "#f99185", "#cf556c", "#b12a5b"] },
    { id: "lady-lips", name: "Lady Lips", direction: "vertical", stops: ["#ff9a9e", "#fecfef", "#fecfef"] },
    { id: "rainy-morning", name: "Rainy Morning", direction: "horizontal", stops: ["#fbc2eb", "#a6c1ee"] },
    { id: "frozen-dreams", name: "Frozen Dreams", direction: "horizontal", stops: ["#fdcbf1", "#fdcbf1", "#e6dee9"] },
    { id: "winter-sun", name: "Winter Sun", direction: "diagonal", stops: ["#a1c4fd", "#c2e9fb"] },
    { id: "tempting-azure", name: "Tempting Azure", direction: "horizontal", stops: ["#84fab0", "#8fd3f4"] },
    { id: "amy-crisp", name: "Amy Crisp", direction: "horizontal", stops: ["#a6c0fe", "#f68084"] },
    { id: "mean-fruit", name: "Mean Fruit", direction: "vertical", stops: ["#fccb90", "#d57eeb"] },
    { id: "deep-blue", name: "Deep Blue", direction: "horizontal", stops: ["#e0c3fc", "#8ec5fc"] },
    { id: "ripe-malinka", name: "Ripe Malinka", direction: "horizontal", stops: ["#f093fb", "#f5576c"] },
    { id: "cloudy-knoxville", name: "Cloudy Knoxville", direction: "diagonal", stops: ["#fdfbfb", "#ebedee"] },
    { id: "soft-porcelain", name: "Soft Porcelain", direction: "horizontal", stops: ["#f7f7f5", "#e9e6e1"] },
    { id: "stone-dust", name: "Stone Dust", direction: "horizontal", stops: ["#e6e2dc", "#c9c3bb"] },
    { id: "warm-taupe", name: "Warm Taupe", direction: "diagonal", stops: ["#d7ccc4", "#a1887f"] },
    { id: "silver-fog", name: "Silver Fog", direction: "vertical", stops: ["#f4f5f7", "#d7dbe2"] },
    { id: "oat-milk", name: "Oat Milk", direction: "horizontal", stops: ["#f5efe6", "#dfd3c3"] },
    { id: "coffee-foam", name: "Coffee Foam", direction: "horizontal", stops: ["#f3e9dc", "#d6ccc2"] },
    { id: "graphite-fade", name: "Graphite Fade", direction: "diagonal", stops: ["#5f6772", "#aab2bd"] },
    { id: "charcoal-mist", name: "Charcoal Mist", direction: "horizontal", stops: ["#3e424b", "#9ba3af"] },
    { id: "ash-velvet", name: "Ash Velvet", direction: "vertical", stops: ["#d8dbe2", "#b3b9c5"] },
    { id: "linen-touch", name: "Linen Touch", direction: "horizontal", stops: ["#f2efe8", "#e5dfd2"] },
    { id: "cappuccino", name: "Cappuccino", direction: "horizontal", stops: ["#efe7dd", "#bfa58a"] },
    { id: "mocha-cream", name: "Mocha Cream", direction: "diagonal", stops: ["#8d6e63", "#efebe9"] },
    { id: "beige-cloud", name: "Beige Cloud", direction: "vertical", stops: ["#f7f1e9", "#d7ccc8"] },
    { id: "concrete-light", name: "Concrete Light", direction: "horizontal", stops: ["#eceff1", "#cfd8dc"] },
    { id: "soft-cement", name: "Soft Cement", direction: "horizontal", stops: ["#dde1e4", "#bcc5cc"] },
    { id: "coal-smoke", name: "Coal Smoke", direction: "diagonal", stops: ["#2f3136", "#6b7280"] },
    { id: "faded-steel", name: "Faded Steel", direction: "horizontal", stops: ["#6f7b8a", "#d2d7de"] },
    { id: "latte-glow", name: "Latte Glow", direction: "horizontal", stops: ["#ede0d4", "#ddb892"] },
    { id: "macchiato", name: "Macchiato", direction: "vertical", stops: ["#d6ccc2", "#9c7c5e"] },
    { id: "marble-sheet", name: "Marble Sheet", direction: "horizontal", stops: ["#f8f9fa", "#dee2e6"] },
    { id: "paper-stone", name: "Paper Stone", direction: "diagonal", stops: ["#fbf7f0", "#c7c1b5"] },
    { id: "urban-clay", name: "Urban Clay", direction: "horizontal", stops: ["#c9b8a8", "#8d7966"] },
    { id: "cool-almond", name: "Cool Almond", direction: "horizontal", stops: ["#f1ede6", "#d5cec0"] },
    { id: "misted-glass", name: "Misted Glass", direction: "vertical", stops: ["#eef2f3", "#d7dee3"] },
    { id: "milk-tea", name: "Milk Tea", direction: "horizontal", stops: ["#efe3d6", "#d2bba0"] },
    { id: "ivory-shadow", name: "Ivory Shadow", direction: "diagonal", stops: ["#fffaf2", "#d7d0c5"] },
    { id: "taupe-satin", name: "Taupe Satin", direction: "horizontal", stops: ["#d7ccc8", "#bcaaa4"] },
    { id: "dusty-latte", name: "Dusty Latte", direction: "vertical", stops: ["#ede3da", "#b39b88"] },
    { id: "shale", name: "Shale", direction: "horizontal", stops: ["#70798c", "#c8d0d9"] },
    { id: "stonewashed", name: "Stonewashed", direction: "horizontal", stops: ["#dfe4ea", "#b2bec3"] },
    { id: "winter-ash", name: "Winter Ash", direction: "diagonal", stops: ["#f1f2f6", "#a4b0be"] },
    { id: "pure-greige", name: "Pure Greige", direction: "horizontal", stops: ["#ece6df", "#c8bfb6"] },
    { id: "dune", name: "Dune", direction: "horizontal", stops: ["#e6d5b8", "#c2a97d"] },
    { id: "sandstorm-soft", name: "Sandstorm Soft", direction: "vertical", stops: ["#f2e8d8", "#d6c2a1"] },
    { id: "toasted-oat", name: "Toasted Oat", direction: "horizontal", stops: ["#eadfce", "#c9b79c"] },
    { id: "mushroom", name: "Mushroom", direction: "diagonal", stops: ["#c7b7a3", "#8d7b68"] },
    { id: "smoky-quartz", name: "Smoky Quartz", direction: "horizontal", stops: ["#9e9e9e", "#616161"] },
    { id: "flannel", name: "Flannel", direction: "horizontal", stops: ["#b0b7c3", "#6c7480"] },
    { id: "stone-ink", name: "Stone Ink", direction: "vertical", stops: ["#4b5563", "#d1d5db"] },
    { id: "grey-pearl", name: "Grey Pearl", direction: "horizontal", stops: ["#f2f4f8", "#c7ccd5"] },
    { id: "soft-quartz", name: "Soft Quartz", direction: "diagonal", stops: ["#ebe7e0", "#d5cec4"] },
    { id: "biscuit", name: "Biscuit", direction: "horizontal", stops: ["#efe1d1", "#d8c0a8"] },
    { id: "milk-coffee", name: "Milk Coffee", direction: "horizontal", stops: ["#f1e7db", "#a1887f"] },
    { id: "latte-stone", name: "Latte Stone", direction: "vertical", stops: ["#eadfd4", "#c1b6aa"] },
    { id: "linen-fade", name: "Linen Fade", direction: "horizontal", stops: ["#f7f2ea", "#d8d2c4"] },
    { id: "winter-beige", name: "Winter Beige", direction: "diagonal", stops: ["#faf6ef", "#d9d0c1"] },
    { id: "fog-bank", name: "Fog Bank", direction: "horizontal", stops: ["#eef1f5", "#cfd6df"] },
    { id: "silver-clay", name: "Silver Clay", direction: "horizontal", stops: ["#dadde2", "#b0b5bd"] },
    { id: "dove-grey", name: "Dove Grey", direction: "vertical", stops: ["#eceff1", "#b0bec5"] },
    { id: "storm-paper", name: "Storm Paper", direction: "horizontal", stops: ["#dfe4ea", "#8a94a6"] },
    { id: "graphite-milk", name: "Graphite Milk", direction: "diagonal", stops: ["#31343b", "#d9dde3"] },
    { id: "chalk", name: "Chalk", direction: "horizontal", stops: ["#fafafa", "#e0e0e0"] },
    { id: "offwhite", name: "Off White", direction: "horizontal", stops: ["#fffdf8", "#ede7dd"] },
    { id: "cotton", name: "Cotton", direction: "vertical", stops: ["#ffffff", "#f1f3f5"] },
    { id: "soft-plaster", name: "Soft Plaster", direction: "horizontal", stops: ["#f5f3ef", "#dcd6cb"] },
    { id: "bone", name: "Bone", direction: "horizontal", stops: ["#f8f4eb", "#e7dccb"] },
    { id: "raw-silk", name: "Raw Silk", direction: "diagonal", stops: ["#f5eee6", "#ddd2c2"] },
    { id: "oyster", name: "Oyster", direction: "horizontal", stops: ["#ede8df", "#cac2b5"] },
    { id: "stone-beige", name: "Stone Beige", direction: "horizontal", stops: ["#ece1d1", "#bfa58a"] },
    { id: "cream-coal", name: "Cream Coal", direction: "vertical", stops: ["#f7f0e8", "#3f3f46"] },
    { id: "driftwood", name: "Driftwood", direction: "horizontal", stops: ["#d7c3a5", "#8d6e63"] },
    { id: "latte-shadow", name: "Latte Shadow", direction: "diagonal", stops: ["#e6d7c3", "#7f6754"] },
    { id: "toffee-cream", name: "Toffee Cream", direction: "horizontal", stops: ["#f4e1c1", "#b08968"] },
    { id: "mocha-fade", name: "Mocha Fade", direction: "horizontal", stops: ["#6d4c41", "#efebe9"] },
    { id: "espresso-milk", name: "Espresso Milk", direction: "vertical", stops: ["#4e342e", "#efe7dd"] },
    { id: "light-mocha", name: "Light Mocha", direction: "horizontal", stops: ["#d7ccc8", "#8d6e63"] },
    { id: "cocoa-mist", name: "Cocoa Mist", direction: "diagonal", stops: ["#a1887f", "#efebe9"] },
    { id: "toasted-beige", name: "Toasted Beige", direction: "horizontal", stops: ["#ead8c0", "#c7a17a"] },
    { id: "malted-milk", name: "Malted Milk", direction: "horizontal", stops: ["#efe2d0", "#cfb997"] },
    { id: "warm-sand", name: "Warm Sand", direction: "vertical", stops: ["#f4e3c3", "#d4b483"] },
    { id: "cashmere", name: "Cashmere", direction: "horizontal", stops: ["#efe7db", "#d8c3a5"] },
    { id: "camel-tone", name: "Camel Tone", direction: "horizontal", stops: ["#d2b48c", "#a67c52"] },
    { id: "desert-cream", name: "Desert Cream", direction: "diagonal", stops: ["#f4e7d3", "#d2b48c"] },
    { id: "almond-stone", name: "Almond Stone", direction: "horizontal", stops: ["#ede0d4", "#cbbba0"] },
    { id: "vanilla-bean", name: "Vanilla Bean", direction: "horizontal", stops: ["#f7ebd8", "#b08968"] },
    { id: "soft-caramel", name: "Soft Caramel", direction: "vertical", stops: ["#e6c79c", "#b08968"] },
    { id: "almond-latte", name: "Almond Latte", direction: "horizontal", stops: ["#efe3d0", "#c2a28d"] },
    { id: "biscotti", name: "Biscotti", direction: "horizontal", stops: ["#eddcc4", "#c9a66b"] },
    { id: "truffle-milk", name: "Truffle Milk", direction: "diagonal", stops: ["#7b5e57", "#e8ddd4"] },
    { id: "sepia-fog", name: "Sepia Fog", direction: "horizontal", stops: ["#c9b7a3", "#eee8df"] },
    { id: "greige-touch", name: "Greige Touch", direction: "horizontal", stops: ["#e8e1d9", "#b5aba1"] },
    { id: "mild-smoke", name: "Mild Smoke", direction: "vertical", stops: ["#e5e7eb", "#9ca3af"] },
    { id: "silver-night", name: "Silver Night", direction: "horizontal", stops: ["#d1d5db", "#4b5563"] },
    { id: "foggy-morning", name: "Foggy Morning", direction: "horizontal", stops: ["#f5f7fa", "#c3cfe2"] },
    { id: "cold-marble", name: "Cold Marble", direction: "diagonal", stops: ["#f8fafc", "#cbd5e1"] },
    { id: "urban-mist", name: "Urban Mist", direction: "horizontal", stops: ["#dfe6e9", "#b2bec3"] },
    { id: "metal-ash", name: "Metal Ash", direction: "horizontal", stops: ["#b0b7c3", "#70798c"] },
    { id: "steel-paper", name: "Steel Paper", direction: "vertical", stops: ["#f1f5f9", "#94a3b8"] },
    { id: "smoke-screen", name: "Smoke Screen", direction: "horizontal", stops: ["#d7dde8", "#757f9a"] },
    { id: "dust-cloud", name: "Dust Cloud", direction: "horizontal", stops: ["#ece9e6", "#ffffff"] },
    { id: "graphite-morning", name: "Graphite Morning", direction: "diagonal", stops: ["#485563", "#f4f7f9"] },
    { id: "ashy-blue", name: "Ashy Blue", direction: "horizontal", stops: ["#cfd9df", "#e2ebf0"] },
    { id: "pebble", name: "Pebble", direction: "horizontal", stops: ["#d7d2cc", "#a9a39d"] },
    { id: "granite-soft", name: "Granite Soft", direction: "vertical", stops: ["#cfd8dc", "#90a4ae"] },
    { id: "cool-stone", name: "Cool Stone", direction: "horizontal", stops: ["#dfe4ea", "#8395a7"] },
    { id: "quiet-grey", name: "Quiet Grey", direction: "horizontal", stops: ["#f4f4f5", "#d4d4d8"] },
    { id: "velvet-greige", name: "Velvet Greige", direction: "diagonal", stops: ["#d6cec3", "#a69f97"] },
    { id: "porcelain-smoke", name: "Porcelain Smoke", direction: "horizontal", stops: ["#f8f5f0", "#c4c1bb"] },
    { id: "cream-line", name: "Cream Line", direction: "horizontal", stops: ["#fff8ee", "#eadfce"] },
    { id: "fog-latte", name: "Fog Latte", direction: "vertical", stops: ["#ebe5dd", "#b0a99f"] },
    { id: "soft-truffle", name: "Soft Truffle", direction: "horizontal", stops: ["#ccb9a8", "#8b7355"] },
    { id: "paper-latte", name: "Paper Latte", direction: "horizontal", stops: ["#f6efe6", "#cebfae"] },
    { id: "stone-porcelain", name: "Stone Porcelain", direction: "diagonal", stops: ["#ede9e3", "#c8c1b8"] },
    { id: "milk-stone", name: "Milk Stone", direction: "horizontal", stops: ["#f8f6f2", "#d9d4cc"] },
    { id: "cool-flannel", name: "Cool Flannel", direction: "horizontal", stops: ["#cfd4da", "#7d8590"] },
    { id: "smoked-almond", name: "Smoked Almond", direction: "vertical", stops: ["#d8c3a5", "#8d6e63"] },
    { id: "taupe-mist", name: "Taupe Mist", direction: "horizontal", stops: ["#d7ccc8", "#9e8f83"] },
    { id: "cafe-au-lait", name: "Cafe Au Lait", direction: "horizontal", stops: ["#ece0d1", "#b08968"] },
    { id: "espresso-beige", name: "Espresso Beige", direction: "diagonal", stops: ["#5d4037", "#e6d3c2"] },
    { id: "chalk-stone", name: "Chalk Stone", direction: "horizontal", stops: ["#f5f5f4", "#d6d3d1"] },
    { id: "ivory-mist", name: "Ivory Mist", direction: "horizontal", stops: ["#fffdf7", "#f1ece1"] },
    { id: "vanilla-cloud", name: "Vanilla Cloud", direction: "diagonal", stops: ["#fff8ea", "#f5ead8"] },
    { id: "linen-glow", name: "Linen Glow", direction: "horizontal", stops: ["#faf6ef", "#ece2d4"] },
    { id: "cream-breeze", name: "Cream Breeze", direction: "vertical", stops: ["#fffaf2", "#f2e8d8"] },
    { id: "porcelain-blush", name: "Porcelain Blush", direction: "horizontal", stops: ["#fffaf8", "#f1e2dd"] },
    { id: "milk-haze", name: "Milk Haze", direction: "horizontal", stops: ["#fbfaf8", "#ebe7e1"] },
    { id: "oat-foam", name: "Oat Foam", direction: "diagonal", stops: ["#faf5ed", "#e7dccd"] },
    { id: "soft-sand", name: "Soft Sand", direction: "horizontal", stops: ["#f8f1e5", "#e8dcc7"] },
    { id: "pearl-latte", name: "Pearl Latte", direction: "vertical", stops: ["#fcfaf6", "#e9dfd2"] },
    { id: "almond-veil", name: "Almond Veil", direction: "horizontal", stops: ["#f7efe8", "#eadbcf"] },
    { id: "beige-dawn", name: "Beige Dawn", direction: "diagonal", stops: ["#faf3eb", "#ead8c7"] },
    { id: "silk-cappuccino", name: "Silk Cappuccino", direction: "horizontal", stops: ["#f8f0e7", "#ddc4aa"] },
    { id: "powder-taupe", name: "Powder Taupe", direction: "horizontal", stops: ["#f2ece7", "#d7cbc2"] },
    { id: "cashmere-cream", name: "Cashmere Cream", direction: "vertical", stops: ["#fffaf1", "#efe5d4"] },
    { id: "sugar-almond", name: "Sugar Almond", direction: "horizontal", stops: ["#fcf6f0", "#ead8ca"] },
    { id: "soft-biscuit", name: "Soft Biscuit", direction: "horizontal", stops: ["#fbf3e6", "#e7d5b7"] },
    { id: "champagne-milk", name: "Champagne Milk", direction: "diagonal", stops: ["#fff8ef", "#f0e0c8"] },
    { id: "warm-porcelain", name: "Warm Porcelain", direction: "horizontal", stops: ["#fdfbf7", "#ece6db"] },
    { id: "frosted-oat", name: "Frosted Oat", direction: "vertical", stops: ["#faf7f1", "#e8e0d2"] },
    { id: "stone-milk", name: "Stone Milk", direction: "horizontal", stops: ["#f8f8f6", "#dedbd4"] },
    { id: "silver-fog", name: "Silver Fog", direction: "horizontal", stops: ["#f7f8fb", "#d9dfe8"] },
    { id: "cloud-paper", name: "Cloud Paper", direction: "vertical", stops: ["#ffffff", "#edf1f5"] },
    { id: "misty-sky", name: "Misty Sky", direction: "horizontal", stops: ["#f7fbff", "#dbe9f6"] },
    { id: "quiet-morning", name: "Quiet Morning", direction: "diagonal", stops: ["#fbfcfe", "#dfe6ee"] },
    { id: "soft-zinc", name: "Soft Zinc", direction: "horizontal", stops: ["#fafaf9", "#e4e4e7"] },
    { id: "paper-blue", name: "Paper Blue", direction: "horizontal", stops: ["#f8fbff", "#dbe7f4"] },
    { id: "cool-porcelain", name: "Cool Porcelain", direction: "vertical", stops: ["#fbfcfd", "#e6edf2"] },
    { id: "alpine-fog", name: "Alpine Fog", direction: "horizontal", stops: ["#f5f9fc", "#d8e3eb"] },
    { id: "ice-sheets", name: "Ice Sheets", direction: "horizontal", stops: ["#f9fcff", "#d9e6f2"] },
    { id: "blue-chalk", name: "Blue Chalk", direction: "diagonal", stops: ["#f7fbfe", "#d7e5f0"] },
    { id: "snow-slate", name: "Snow Slate", direction: "horizontal", stops: ["#fbfcfd", "#d5dde5"] },
    { id: "winter-paper", name: "Winter Paper", direction: "vertical", stops: ["#fbfdff", "#e2e8f0"] },
    { id: "faded-denim", name: "Faded Denim", direction: "horizontal", stops: ["#eef4fb", "#cad9ea"] },
    { id: "studio-frost", name: "Studio Frost", direction: "horizontal", stops: ["#f8fbff", "#dde8f2"] },
    { id: "air-grey", name: "Air Grey", direction: "diagonal", stops: ["#fcfcfd", "#e5e7eb"] },
    { id: "soft-concrete", name: "Soft Concrete", direction: "horizontal", stops: ["#f4f4f5", "#d6d3d1"] },
    { id: "pale-graphite", name: "Pale Graphite", direction: "horizontal", stops: ["#f3f4f6", "#cbd5e1"] },
    { id: "frost-silver", name: "Frost Silver", direction: "vertical", stops: ["#fbfdff", "#dce4ee"] },
    { id: "milk-steel", name: "Milk Steel", direction: "horizontal", stops: ["#f8f9fb", "#d9dee4"] },
    { id: "mint-paper", name: "Mint Paper", direction: "horizontal", stops: ["#f6fff9", "#d7f1e2"] },
    { id: "soft-pistachio", name: "Soft Pistachio", direction: "diagonal", stops: ["#f7fff5", "#d9edc8"] },
    { id: "sage-milk", name: "Sage Milk", direction: "horizontal", stops: ["#f6faf5", "#d8e4d0"] },
    { id: "green-whisper", name: "Green Whisper", direction: "vertical", stops: ["#f4fff7", "#d4f0dc"] },
    { id: "pale-mint", name: "Pale Mint", direction: "horizontal", stops: ["#f4fff9", "#ccf1df"] },
    { id: "eucalyptus-air", name: "Eucalyptus Air", direction: "horizontal", stops: ["#f2fbf6", "#d3ebdc"] },
    { id: "lime-foam", name: "Lime Foam", direction: "diagonal", stops: ["#fbfff3", "#dff0b8"] },
    { id: "green-tea-mist", name: "Green Tea Mist", direction: "horizontal", stops: ["#f8fff3", "#d7e9c7"] },
    { id: "garden-veil", name: "Garden Veil", direction: "vertical", stops: ["#f7fff8", "#d6ead9"] },
    { id: "olive-paper", name: "Olive Paper", direction: "horizontal", stops: ["#fafdf7", "#dfe4d0"] },
    { id: "cucumber-milk", name: "Cucumber Milk", direction: "horizontal", stops: ["#f4fff7", "#cfead8"] },
    { id: "fresh-sage", name: "Fresh Sage", direction: "diagonal", stops: ["#f6fbf5", "#d4e3d1"] },
    { id: "mint-cream-light", name: "Mint Cream Light", direction: "horizontal", stops: ["#f5fff8", "#d7f2e6"] },
    { id: "aloe-whisper", name: "Aloe Whisper", direction: "vertical", stops: ["#f5fff9", "#d9f0e3"] },
    { id: "celery-fog", name: "Celery Fog", direction: "horizontal", stops: ["#fcfff8", "#e2f0cf"] },
    { id: "green-silk", name: "Green Silk", direction: "horizontal", stops: ["#f8fff9", "#dcebdc"] },
    { id: "pear-milk", name: "Pear Milk", direction: "diagonal", stops: ["#fbfff6", "#e0efc9"] },
    { id: "spring-paper", name: "Spring Paper", direction: "horizontal", stops: ["#fbfff9", "#e0f0df"] },
    { id: "matcha-foam", name: "Matcha Foam", direction: "vertical", stops: ["#f6fff5", "#daeac8"] },
    { id: "ice-mint-veil", name: "Ice Mint Veil", direction: "horizontal", stops: ["#f7fffd", "#d6f4ea"] },
    { id: "lemon-milk", name: "Lemon Milk", direction: "horizontal", stops: ["#fffef3", "#f6efbb"] },
    { id: "buttercream", name: "Buttercream", direction: "diagonal", stops: ["#fffbe8", "#f4e3a6"] },
    { id: "vanilla-sun", name: "Vanilla Sun", direction: "horizontal", stops: ["#fff8de", "#f2dd8f"] },
    { id: "soft-honey", name: "Soft Honey", direction: "vertical", stops: ["#fff8e8", "#eed48f"] },
    { id: "custard-glow", name: "Custard Glow", direction: "horizontal", stops: ["#fffceb", "#f7e7b2"] },
    { id: "mellow-yellow", name: "Mellow Yellow", direction: "horizontal", stops: ["#fffde8", "#f2ebb2"] },
    { id: "champagne-light", name: "Champagne Light", direction: "diagonal", stops: ["#fff9ec", "#f3e1b7"] },
    { id: "sunlit-cream", name: "Sunlit Cream", direction: "horizontal", stops: ["#fff9e8", "#f7e3ad"] },
    { id: "dandelion-milk", name: "Dandelion Milk", direction: "vertical", stops: ["#fffef2", "#f0e0a4"] },
    { id: "pale-saffron", name: "Pale Saffron", direction: "horizontal", stops: ["#fff8ea", "#efd08e"] },
    { id: "cornsilk-latte", name: "Cornsilk Latte", direction: "horizontal", stops: ["#fff7e6", "#f0ddba"] },
    { id: "golden-foam", name: "Golden Foam", direction: "diagonal", stops: ["#fffced", "#f3de9b"] },
    { id: "banana-cream", name: "Banana Cream", direction: "horizontal", stops: ["#fffde6", "#f3efb0"] },
    { id: "pastel-amber", name: "Pastel Amber", direction: "vertical", stops: ["#fff9eb", "#efd9a7"] },
    { id: "linen-sunrise", name: "Linen Sunrise", direction: "horizontal", stops: ["#fff8ef", "#f2dfbe"] },
    { id: "soft-maize", name: "Soft Maize", direction: "horizontal", stops: ["#fffce9", "#eee3a8"] },
    { id: "vanilla-beam", name: "Vanilla Beam", direction: "diagonal", stops: ["#fffbea", "#f6e9ba"] },
    { id: "light-apricot", name: "Light Apricot", direction: "horizontal", stops: ["#fff3ea", "#ffd2b8"] },
    { id: "peach-foam", name: "Peach Foam", direction: "diagonal", stops: ["#fff5ef", "#ffd9c9"] },
    { id: "coral-milk", name: "Coral Milk", direction: "horizontal", stops: ["#fff4f2", "#ffd2c7"] },
    { id: "rose-cream", name: "Rose Cream", direction: "vertical", stops: ["#fff6f7", "#f8d7dc"] },
    { id: "blush-porcelain", name: "Blush Porcelain", direction: "horizontal", stops: ["#fff8f8", "#f4dce0"] },
    { id: "pink-latte", name: "Pink Latte", direction: "horizontal", stops: ["#fff6f4", "#f1d5cf"] },
    { id: "melon-milk", name: "Melon Milk", direction: "diagonal", stops: ["#fff5ef", "#ffd6c2"] },
    { id: "soft-salmon", name: "Soft Salmon", direction: "horizontal", stops: ["#fff2ef", "#f9c9be"] },
    { id: "powder-rose", name: "Powder Rose", direction: "vertical", stops: ["#fff7f8", "#efd1d8"] },
    { id: "peach-porcelain", name: "Peach Porcelain", direction: "horizontal", stops: ["#fff6f1", "#f6ddd1"] },
    { id: "apricot-paper", name: "Apricot Paper", direction: "horizontal", stops: ["#fff7ef", "#f3decf"] },
    { id: "cotton-coral", name: "Cotton Coral", direction: "diagonal", stops: ["#fff5f4", "#f7d4cf"] },
    { id: "soft-blush-light", name: "Soft Blush Light", direction: "horizontal", stops: ["#fff8f8", "#f5e0e4"] },
    { id: "petal-milk", name: "Petal Milk", direction: "vertical", stops: ["#fff9fa", "#f2dde4"] },
    { id: "nude-cream", name: "Nude Cream", direction: "horizontal", stops: ["#fff6f2", "#ecd7cf"] },
    { id: "rosewater-latte", name: "Rosewater Latte", direction: "horizontal", stops: ["#fff8f6", "#ead8d3"] },
    { id: "peony-fog", name: "Peony Fog", direction: "diagonal", stops: ["#fff8fa", "#efd8e6"] },
    { id: "light-lilac-veil", name: "Light Lilac Veil", direction: "horizontal", stops: ["#faf7ff", "#e4dbf5"] },
    { id: "lavender-paper", name: "Lavender Paper", direction: "horizontal", stops: ["#fbf9ff", "#e5e0f6"] },
    { id: "violet-milk", name: "Violet Milk", direction: "diagonal", stops: ["#faf7ff", "#ddd4f3"] },
    { id: "mauve-frost", name: "Mauve Frost", direction: "horizontal", stops: ["#fdf9ff", "#eadff1"] },
    { id: "orchid-haze", name: "Orchid Haze", direction: "vertical", stops: ["#fcf8ff", "#e6d9f7"] },
    { id: "powder-plum", name: "Powder Plum", direction: "horizontal", stops: ["#fbf8ff", "#e3d7ec"] },
    { id: "soft-amethyst", name: "Soft Amethyst", direction: "horizontal", stops: ["#faf7ff", "#ddd5f7"] },
    { id: "iris-milk", name: "Iris Milk", direction: "diagonal", stops: ["#fbf8ff", "#e8dff8"] },
    { id: "lilac-cloud", name: "Lilac Cloud", direction: "horizontal", stops: ["#fcfbff", "#ece7fb"] },
    { id: "violet-fog-light", name: "Violet Fog Light", direction: "vertical", stops: ["#fbfaff", "#e6e0f5"] },
    { id: "blue-lilac-paper", name: "Blue Lilac Paper", direction: "horizontal", stops: ["#fafbff", "#dfe5fa"] },
    { id: "soft-periwinkle", name: "Soft Periwinkle", direction: "horizontal", stops: ["#f7f9ff", "#d8dff8"] },
    { id: "sky-porcelain", name: "Sky Porcelain", direction: "diagonal", stops: ["#f8fbff", "#d8e8fb"] },
    { id: "blue-milk-light", name: "Blue Milk Light", direction: "horizontal", stops: ["#f7fbff", "#dcecf9"] },
    { id: "powder-aqua", name: "Powder Aqua", direction: "vertical", stops: ["#f4fcff", "#d5eef2"] },
    { id: "sea-foam-paper", name: "Sea Foam Paper", direction: "horizontal", stops: ["#f5fffd", "#d8f0ea"] },
    { id: "turquoise-milk", name: "Turquoise Milk", direction: "horizontal", stops: ["#f4fffd", "#d0f1ea"] },
    { id: "glacier-mint", name: "Glacier Mint", direction: "diagonal", stops: ["#f5ffff", "#d6f2ee"] },
    { id: "aqua-porcelain", name: "Aqua Porcelain", direction: "horizontal", stops: ["#f6fffd", "#d8f4f0"] }
  ];

  let activePresetId = PRESETS[0].id;
  let activeAssetKind = "gradient";
  const imageElementCache = new Map();
  let importedBackgroundAsset = null;
  window.__PROJECT_BACKGROUND_DEFAULT = window.__PROJECT_BACKGROUND_DEFAULT || null;
  let previewState = {
    page: null,
    originalFill: null,
    originalGradient: null,
    originalKind: null,
    originalBackgroundFill: null,
    originalImageSrc: null
  };

  function getPresetById(id) {
    return PRESETS.find((preset) => preset.id === id) || PRESETS[0];
  }

  function getActivePage() {
    const pages = Array.isArray(window.pages) ? window.pages : [];
    if (!pages.length) return null;
    return pages.find((page) => page && page.stage === document.activeStage) || pages[0] || null;
  }

  function getPageBg(page) {
    if (!page || !page.layer || typeof page.layer.findOne !== "function") return null;
    return page.layer.findOne((n) => n && n.getAttr && n.getAttr("isPageBg") === true) || null;
  }

  function loadImageElement(src) {
    if (!src) return Promise.resolve(null);
    if (imageElementCache.has(src)) return imageElementCache.get(src);
    const promise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageElementCache.set(src, promise);
    return promise;
  }

  function setActiveAssetKind(kind) {
    activeAssetKind = kind === "image" ? "image" : "gradient";
    const imagePreview = document.getElementById("backgroundPreview");
    if (imagePreview) {
      imagePreview.classList.toggle("is-active-asset", activeAssetKind === "image");
    }
    const gradientBox = document.getElementById("gradientToolbox");
    if (gradientBox) {
      gradientBox.classList.toggle("is-active-asset", activeAssetKind === "gradient");
    }
  }

  function getImportedBackgroundAsset() {
    return importedBackgroundAsset && importedBackgroundAsset.originalSrc ? importedBackgroundAsset : null;
  }

  function renderImportedBackgroundPreview() {
    const preview = document.getElementById("backgroundPreview");
    if (!preview) return;
    const asset = getImportedBackgroundAsset();
    if (!asset) {
      preview.innerHTML = "";
      preview.classList.remove("is-active-asset");
      return;
    }
    preview.innerHTML = "";
    const img = document.createElement("img");
    img.src = asset.previewSrc || asset.originalSrc;
    img.alt = asset.name || "Tlo";
    img.style.cssText = "max-width:100%; max-height:96px; margin-top:6px; border-radius:8px; display:block;";
    img.addEventListener("click", () => setActiveAssetKind("image"));
    preview.appendChild(img);
    preview.classList.toggle("is-active-asset", activeAssetKind === "image");
  }

  function createPreviewSrcFromImage(img, maxSize = 280) {
    const width = img.naturalWidth || img.width || 1;
    const height = img.naturalHeight || img.height || 1;
    const scale = Math.min(1, maxSize / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  }

  function buildStops(colors = []) {
    const clean = Array.isArray(colors) ? colors.filter(Boolean) : [];
    if (!clean.length) return [0, "#ffffff", 1, "#f1f5f9"];
    if (clean.length === 1) return [0, clean[0], 1, clean[0]];
    const lastIndex = clean.length - 1;
    return clean.flatMap((color, index) => [index / lastIndex, color]);
  }

  function getGradientPoints(preset, width, height) {
    const direction = String(preset?.direction || "horizontal");
    if (direction === "vertical") {
      return { start: { x: 0, y: 0 }, end: { x: 0, y: height } };
    }
    if (direction === "diagonal") {
      return { start: { x: 0, y: 0 }, end: { x: width, y: height } };
    }
    return { start: { x: 0, y: 0 }, end: { x: width, y: 0 } };
  }

  function normalizeGradientPreset(preset) {
    const source = preset || PRESETS[0];
    return {
      id: String(source.id || "custom"),
      name: String(source.name || "Gradient"),
      direction: String(source.direction || "horizontal"),
      stops: Array.isArray(source.stops) ? source.stops.slice() : []
    };
  }

  function applyGradientToBackgroundNode(bg, preset) {
    if (!bg || typeof bg.width !== "function" || typeof bg.height !== "function") return;
    const normalized = normalizeGradientPreset(preset);
    const points = getGradientPoints(normalized, bg.width(), bg.height());
    bg.fillPriority("linear-gradient");
    bg.fillLinearGradientStartPoint(points.start);
    bg.fillLinearGradientEndPoint(points.end);
    bg.fillLinearGradientColorStops(buildStops(normalized.stops));
    bg.fill(normalized.stops[0] || "#ffffff");
    bg.setAttr("backgroundGradient", normalized);
    bg.setAttr("backgroundKind", "gradient");
    bg.setAttr("backgroundFill", normalized.stops[0] || "#ffffff");
  }

  function clearGradientFromBackgroundNode(bg) {
    if (!bg) return;
    bg.fillPriority("color");
    bg.fillLinearGradientColorStops([]);
    bg.fillLinearGradientStartPoint({ x: 0, y: 0 });
    bg.fillLinearGradientEndPoint({ x: 0, y: 0 });
    const baseFill = String(bg.getAttr("backgroundFill") || bg.fill() || "#ffffff");
    bg.fill(baseFill);
    bg.setAttr("backgroundGradient", null);
    bg.setAttr("backgroundKind", "color");
  }

  function clearImageFromBackgroundNode(bg) {
    if (!bg) return;
    bg.fillPatternImage(null);
    bg.fillPatternRepeat("no-repeat");
    bg.fillPatternScale({ x: 1, y: 1 });
    bg.fillPatternX(0);
    bg.fillPatternY(0);
    bg.setAttr("backgroundImageSrc", null);
  }

  async function applyImageToBackgroundNode(bg, imageSrc) {
    if (!bg || !imageSrc || typeof bg.width !== "function" || typeof bg.height !== "function") return false;
    const img = await loadImageElement(imageSrc);
    if (!img) return false;
    const bgWidth = bg.width();
    const bgHeight = bg.height();
    const scale = Math.max(bgWidth / (img.naturalWidth || img.width || 1), bgHeight / (img.naturalHeight || img.height || 1));
    const scaledWidth = (img.naturalWidth || img.width || 1) * scale;
    const scaledHeight = (img.naturalHeight || img.height || 1) * scale;
    bg.fillPriority("pattern");
    bg.fillPatternImage(img);
    bg.fillPatternRepeat("no-repeat");
    bg.fillPatternScale({ x: scale, y: scale });
    bg.fillPatternX((bgWidth - scaledWidth) / 2);
    bg.fillPatternY((bgHeight - scaledHeight) / 2);
    bg.setAttr("backgroundGradient", null);
    bg.setAttr("backgroundKind", "image");
    bg.setAttr("backgroundImageSrc", imageSrc);
    bg.setAttr("backgroundFill", bg.fill() || "#ffffff");
    return true;
  }

  function rememberPreviewOriginal(page, bg) {
    if (!page || !bg) return;
    if (previewState.page === page) return;
    previewState = {
      page,
      originalFill: bg.fill(),
      originalGradient: bg.getAttr("backgroundGradient") || null,
      originalKind: bg.getAttr("backgroundKind") || "color",
      originalBackgroundFill: bg.getAttr("backgroundFill") || bg.fill() || "#ffffff",
      originalImageSrc: bg.getAttr("backgroundImageSrc") || null
    };
  }

  async function restorePreviewIfNeeded() {
    const page = previewState.page;
    if (!page) return;
    const bg = getPageBg(page);
    if (!bg) {
      previewState = { page: null, originalFill: null, originalGradient: null, originalKind: null, originalBackgroundFill: null, originalImageSrc: null };
      return;
    }
    if (previewState.originalGradient) {
      clearImageFromBackgroundNode(bg);
      applyGradientToBackgroundNode(bg, previewState.originalGradient);
      bg.setAttr("backgroundKind", previewState.originalKind || "gradient");
      bg.setAttr("backgroundFill", previewState.originalBackgroundFill || previewState.originalFill || "#ffffff");
    } else if (previewState.originalImageSrc) {
      clearGradientFromBackgroundNode(bg);
      await applyImageToBackgroundNode(bg, previewState.originalImageSrc);
      bg.setAttr("backgroundKind", previewState.originalKind || "image");
      bg.setAttr("backgroundFill", previewState.originalBackgroundFill || previewState.originalFill || "#ffffff");
    } else {
      clearImageFromBackgroundNode(bg);
      bg.fillPriority("color");
      bg.fillLinearGradientColorStops([]);
      bg.fillLinearGradientStartPoint({ x: 0, y: 0 });
      bg.fillLinearGradientEndPoint({ x: 0, y: 0 });
      bg.fill(String(previewState.originalFill || previewState.originalBackgroundFill || "#ffffff"));
      bg.setAttr("backgroundGradient", null);
      bg.setAttr("backgroundKind", previewState.originalKind || "color");
      bg.setAttr("backgroundFill", previewState.originalBackgroundFill || previewState.originalFill || "#ffffff");
    }
    redrawPage(page);
    previewState = { page: null, originalFill: null, originalGradient: null, originalKind: null, originalBackgroundFill: null, originalImageSrc: null };
  }

  function previewGradientOnPage(page, preset) {
    const bg = getPageBg(page);
    if (!bg) return false;
    if (previewState.page && previewState.page !== page) {
      restorePreviewIfNeeded();
    }
    rememberPreviewOriginal(page, bg);
    applyGradientToBackgroundNode(bg, preset);
    redrawPage(page);
    return true;
  }

  async function previewImageOnPage(page, imageSrc) {
    const bg = getPageBg(page);
    if (!bg || !imageSrc) return false;
    if (previewState.page && previewState.page !== page) {
      await restorePreviewIfNeeded();
    }
    rememberPreviewOriginal(page, bg);
    clearGradientFromBackgroundNode(bg);
    await applyImageToBackgroundNode(bg, imageSrc);
    redrawPage(page);
    return true;
  }

  function syncPageSettings(page, bg) {
    if (!page || !bg) return;
    page.settings = page.settings || {};
    page.settings.pageBgColor = bg.getAttr("backgroundFill") || bg.fill() || "#ffffff";
    page.settings.pageOpacity = typeof bg.opacity === "function" ? (bg.opacity() ?? 1) : 1;
    page.settings.backgroundGradient = bg.getAttr("backgroundGradient") || null;
    page.settings.backgroundKind = bg.getAttr("backgroundKind") || "color";
    page.settings.backgroundImageSrc = bg.getAttr("backgroundImageSrc") || null;
  }

  function cloneBackgroundDefaultPayload(payload) {
    if (!payload || typeof payload !== "object") return null;
    try {
      return JSON.parse(JSON.stringify(payload));
    } catch (_e) {
      return null;
    }
  }

  function setProjectBackgroundDefault(payload) {
    window.__PROJECT_BACKGROUND_DEFAULT = cloneBackgroundDefaultPayload(payload);
  }

  function syncProjectBackgroundDefaultFromPage(page) {
    if (!page || !page.settings) return;
    const kind = String(page.settings.backgroundKind || "color");
    const opacityRaw = Number(page.settings.pageOpacity);
    const opacity = Number.isFinite(opacityRaw) ? Math.max(0, Math.min(1, opacityRaw)) : 1;
    if (kind === "gradient" && page.settings.backgroundGradient) {
      setProjectBackgroundDefault({
        kind: "gradient",
        fill: page.settings.pageBgColor || "#ffffff",
        opacity,
        gradient: normalizeGradientPreset(page.settings.backgroundGradient)
      });
      return;
    }
    if (kind === "image" && page.settings.backgroundImageSrc) {
      setProjectBackgroundDefault({
        kind: "image",
        fill: page.settings.pageBgColor || "#ffffff",
        opacity,
        imageSrc: String(page.settings.backgroundImageSrc || "")
      });
      return;
    }
    setProjectBackgroundDefault({
      kind: "color",
      fill: page.settings.pageBgColor || "#ffffff",
      opacity
    });
  }

  function redrawPage(page) {
    if (!page) return;
    try { page.layer?.batchDraw?.(); } catch (_e) {}
    try { page.transformerLayer?.batchDraw?.(); } catch (_e) {}
    try { page.stage?.batchDraw?.(); } catch (_e) {}
  }

  function applyGradientToPage(page, preset) {
    const bg = getPageBg(page);
    if (!bg) return false;
    if (previewState.page === page) {
      previewState = { page: null, originalFill: null, originalGradient: null, originalKind: null, originalBackgroundFill: null, originalImageSrc: null };
    }
    clearImageFromBackgroundNode(bg);
    applyGradientToBackgroundNode(bg, preset);
    syncPageSettings(page, bg);
    redrawPage(page);
    return true;
  }

  async function applyImageToPage(page, imageSrc) {
    const bg = getPageBg(page);
    if (!bg || !imageSrc) return false;
    if (previewState.page === page) {
      previewState = { page: null, originalFill: null, originalGradient: null, originalKind: null, originalBackgroundFill: null, originalImageSrc: null };
    }
    clearGradientFromBackgroundNode(bg);
    const applied = await applyImageToBackgroundNode(bg, imageSrc);
    if (!applied) return false;
    syncPageSettings(page, bg);
    redrawPage(page);
    return true;
  }

  function clearGradientFromPage(page) {
    const bg = getPageBg(page);
    if (!bg) return false;
    if (previewState.page === page) {
      previewState = { page: null, originalFill: null, originalGradient: null, originalKind: null, originalBackgroundFill: null, originalImageSrc: null };
    }
    clearImageFromBackgroundNode(bg);
    clearGradientFromBackgroundNode(bg);
    syncPageSettings(page, bg);
    redrawPage(page);
    return true;
  }

  function renderPresetButtons() {
    const host = document.getElementById("gradientPresetGrid");
    if (!host) return;
    host.innerHTML = "";
    PRESETS.forEach((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gradient-preset-btn";
      button.dataset.gradientPreset = preset.id;
      if (preset.id === activePresetId) button.classList.add("is-active");
      const swatch = document.createElement("div");
      swatch.className = "gradient-preset-swatch";
      swatch.style.background = `linear-gradient(${preset.direction === "vertical" ? "180deg" : preset.direction === "diagonal" ? "135deg" : "90deg"}, ${preset.stops.join(", ")})`;
      const label = document.createElement("div");
      label.className = "gradient-preset-name";
      label.textContent = preset.name;
      button.appendChild(swatch);
      button.appendChild(label);
      button.addEventListener("click", () => {
        setActiveAssetKind("gradient");
        activePresetId = preset.id;
        host.querySelectorAll(".gradient-preset-btn").forEach((node) => {
          node.classList.toggle("is-active", node.dataset.gradientPreset === preset.id);
        });
        const page = getActivePage();
        if (page) {
          previewGradientOnPage(page, preset);
        }
      });
      host.appendChild(button);
    });
  }

  function bindActions() {
    const applyCurrentBtn = document.getElementById("applyGradientCurrentBtn");
    const applyAllBtn = document.getElementById("applyGradientAllBtn");
    const clearBtn = document.getElementById("clearGradientBtn");
    const bgInput = document.getElementById("backgroundFileInput");

    if (applyCurrentBtn) {
      applyCurrentBtn.addEventListener("click", async () => {
        const page = getActivePage();
        if (!page) return;
        const imageAsset = getImportedBackgroundAsset();
        if (activeAssetKind === "image" && imageAsset) {
          await restorePreviewIfNeeded();
          await applyImageToPage(page, imageAsset.originalSrc);
          return;
        }
        applyGradientToPage(page, getPresetById(activePresetId));
      });
    }

    if (applyAllBtn) {
      applyAllBtn.addEventListener("click", async () => {
        const pages = Array.isArray(window.pages) ? window.pages : [];
        const imageAsset = getImportedBackgroundAsset();
        await restorePreviewIfNeeded();
        if (activeAssetKind === "image" && imageAsset) {
          for (const page of pages) {
            await applyImageToPage(page, imageAsset.originalSrc);
          }
          const sourcePage = getActivePage() || pages[0] || null;
          if (sourcePage) syncProjectBackgroundDefaultFromPage(sourcePage);
          return;
        }
        const preset = getPresetById(activePresetId);
        pages.forEach((page) => applyGradientToPage(page, preset));
        const sourcePage = getActivePage() || pages[0] || null;
        if (sourcePage) syncProjectBackgroundDefaultFromPage(sourcePage);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", async () => {
        const page = getActivePage();
        if (!page) return;
        await restorePreviewIfNeeded();
        clearGradientFromPage(page);
      });
    }

    if (bgInput) {
      bgInput.addEventListener("change", async () => {
        const file = bgInput.files && bgInput.files[0];
        if (!file || !file.type.startsWith("image/")) {
          importedBackgroundAsset = null;
          renderImportedBackgroundPreview();
          return;
        }
        const originalSrc = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e?.target?.result || null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
        if (!originalSrc) return;
        const imageEl = await loadImageElement(originalSrc);
        importedBackgroundAsset = {
          name: file.name || "Tlo",
          originalSrc,
          previewSrc: imageEl ? createPreviewSrcFromImage(imageEl, 280) : originalSrc
        };
        setActiveAssetKind("image");
        renderImportedBackgroundPreview();
      });
    }
  }

  window.applySavedBackgroundImage = async function(page, imageSrc) {
    if (!page || !imageSrc) return;
    await applyImageToPage(page, imageSrc);
  };

  window.applySavedBackgroundGradient = function(page, gradientPreset) {
    if (!page || !gradientPreset) return;
    applyGradientToPage(page, gradientPreset);
  };

  window.applyProjectDefaultBackgroundToPage = async function(page) {
    const payload = cloneBackgroundDefaultPayload(window.__PROJECT_BACKGROUND_DEFAULT);
    if (!page || !payload) return false;
    if (payload.kind === "image" && payload.imageSrc) {
      return !!(await applyImageToPage(page, payload.imageSrc));
    }
    if (payload.kind === "gradient" && payload.gradient) {
      applyGradientToPage(page, payload.gradient);
      return true;
    }
    const bg = getPageBg(page);
    if (!bg) return false;
    clearImageFromBackgroundNode(bg);
    clearGradientFromBackgroundNode(bg);
    const fill = String(payload.fill || "#ffffff");
    bg.fillPriority("color");
    bg.fill(fill);
    bg.opacity(Number.isFinite(Number(payload.opacity)) ? Number(payload.opacity) : 1);
    bg.setAttr("backgroundFill", fill);
    bg.setAttr("backgroundKind", "color");
    syncPageSettings(page, bg);
    redrawPage(page);
    return true;
  };

  window.__TLO_GRADIENT_PRESETS = PRESETS;

  document.addEventListener("DOMContentLoaded", () => {
    renderPresetButtons();
    bindActions();
  });
})();
