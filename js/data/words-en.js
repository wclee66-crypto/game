/* 새록 — 낱말찾기 낱말 모음 (영어판)
 *
 * 한글은 한 칸에 한 글자(음절)가 들어가지만, 영어는 한 칸에 알파벳 하나다.
 * 그래서 같은 판 크기라도 들어갈 수 있는 낱말의 길이가 다르다.
 * 단계별 최대 길이는 js/games/wordsearch.js 에서 말에 따라 갈라 정한다.
 *
 * 여기의 글은 T() 로 감싸지 않는다. 영어에서만 쓰이는 자료라 옮길 일이 없다.
 *
 * 고르는 기준
 *   - 글자판에 큼직하게 보이도록 모두 대문자로 적는다.
 *   - 주제마다 다섯 자 이하 낱말을 여섯 개 넘게 둔다. 앞 단계의 작은 판에 들어가야 한다.
 *   - 한 낱말이 다른 낱말 안에 통째로 들어가면 안 된다 (PEN 이 PENCIL 안에 있으면
 *     긴 낱말에서 짧은 것을 찾아 버린다).
 */
window.WORD_THEMES_EN = [
  { id: 'fruit', name: 'Fruit', words: ['FIG', 'PEAR', 'PLUM', 'APPLE', 'GRAPE', 'LEMON', 'MELON', 'MANGO', 'BERRY', 'PEACH', 'CHERRY', 'BANANA', 'ORANGE', 'APRICOT'] },
  { id: 'vege', name: 'Vegetables', words: ['PEA', 'BEAN', 'BEET', 'CORN', 'LEEK', 'ONION', 'CARROT', 'POTATO', 'TOMATO', 'TURNIP', 'RADISH', 'CELERY', 'GARLIC', 'CABBAGE'] },
  { id: 'animal', name: 'Animals', words: ['CAT', 'DOG', 'COW', 'PIG', 'FOX', 'LION', 'BEAR', 'DEER', 'HORSE', 'TIGER', 'ZEBRA', 'MONKEY', 'RABBIT', 'GIRAFFE'] },
  { id: 'bird', name: 'Birds', words: ['OWL', 'HEN', 'CROW', 'DOVE', 'DUCK', 'SWAN', 'EAGLE', 'ROBIN', 'STORK', 'PIGEON', 'PARROT', 'TURKEY', 'PENGUIN', 'SPARROW'] },
  { id: 'sea', name: 'Sea Life', words: ['COD', 'CRAB', 'SEAL', 'TUNA', 'CLAM', 'WHALE', 'SHARK', 'SQUID', 'TROUT', 'OYSTER', 'SALMON', 'LOBSTER', 'DOLPHIN', 'OCTOPUS'] },
  { id: 'flower', name: 'Flowers', words: ['ROSE', 'LILY', 'IRIS', 'TULIP', 'DAISY', 'POPPY', 'PANSY', 'LOTUS', 'PEONY', 'LILAC', 'VIOLET', 'ORCHID', 'DAHLIA', 'JASMINE'] },
  { id: 'tree', name: 'Trees', words: ['OAK', 'ELM', 'FIR', 'PINE', 'PALM', 'BIRCH', 'MAPLE', 'CEDAR', 'ASPEN', 'BEECH', 'WILLOW', 'POPLAR', 'WALNUT', 'CHESTNUT'] },
  { id: 'body', name: 'The Body', words: ['ARM', 'LEG', 'EAR', 'EYE', 'HIP', 'HAND', 'FOOT', 'KNEE', 'CHEST', 'ELBOW', 'WRIST', 'ANKLE', 'FINGER', 'SHOULDER'] },
  { id: 'kitchen', name: 'Kitchen', words: ['PAN', 'POT', 'CUP', 'BOWL', 'FORK', 'TRAY', 'KNIFE', 'SPOON', 'PLATE', 'LADLE', 'WHISK', 'KETTLE', 'GRATER', 'SKILLET'] },
  { id: 'cloth', name: 'Clothes', words: ['HAT', 'CAP', 'COAT', 'VEST', 'SOCK', 'SHIRT', 'DRESS', 'SKIRT', 'GLOVE', 'SCARF', 'JACKET', 'SANDAL', 'SWEATER', 'TROUSERS'] },
  { id: 'house', name: 'The House', words: ['DOOR', 'WALL', 'ROOF', 'FLOOR', 'STAIR', 'ATTIC', 'PORCH', 'FENCE', 'WINDOW', 'GARDEN', 'CELLAR', 'KITCHEN', 'BEDROOM', 'CHIMNEY'] },
  { id: 'furniture', name: 'Furniture', words: ['BED', 'DESK', 'SOFA', 'LAMP', 'CHAIR', 'TABLE', 'SHELF', 'STOOL', 'MIRROR', 'CARPET', 'DRAWER', 'CURTAIN', 'CUSHION', 'CUPBOARD'] },
  { id: 'weather', name: 'Weather', words: ['SUN', 'FOG', 'MIST', 'RAIN', 'SNOW', 'WIND', 'HAIL', 'CLOUD', 'STORM', 'FROST', 'BREEZE', 'SHOWER', 'THUNDER', 'DROUGHT'] },
  { id: 'color', name: 'Colours', words: ['RED', 'BLUE', 'PINK', 'GREY', 'GOLD', 'BLACK', 'WHITE', 'GREEN', 'BROWN', 'PURPLE', 'ORANGE', 'YELLOW', 'SILVER', 'VIOLET'] },
  { id: 'number', name: 'Numbers', words: ['ONE', 'TWO', 'SIX', 'TEN', 'FOUR', 'FIVE', 'NINE', 'THREE', 'SEVEN', 'EIGHT', 'ELEVEN', 'TWELVE', 'TWENTY', 'HUNDRED'] },
  { id: 'time', name: 'Time', words: ['DAWN', 'WEEK', 'YEAR', 'HOUR', 'NOON', 'MONTH', 'NIGHT', 'TODAY', 'MINUTE', 'SECOND', 'SUNDAY', 'MONDAY', 'MORNING', 'EVENING'] },
  { id: 'family', name: 'Family', words: ['SON', 'WIFE', 'TWIN', 'AUNT', 'UNCLE', 'NIECE', 'COUSIN', 'NEPHEW', 'MOTHER', 'FATHER', 'SISTER', 'GRANNY', 'PARENT', 'BROTHER'] },
  { id: 'school', name: 'School', words: ['DESK', 'BOOK', 'NOTE', 'EXAM', 'RULER', 'CHALK', 'PAPER', 'CLASS', 'PENCIL', 'ERASER', 'LESSON', 'TEACHER', 'STUDENT', 'LIBRARY'] },
  { id: 'job', name: 'Jobs', words: ['CHEF', 'CLERK', 'NURSE', 'BAKER', 'PILOT', 'JUDGE', 'FARMER', 'DOCTOR', 'SAILOR', 'DRIVER', 'TAILOR', 'WAITER', 'ARTIST', 'DENTIST'] },
  { id: 'ride', name: 'Transport', words: ['BUS', 'CAR', 'VAN', 'SHIP', 'BIKE', 'TRAM', 'TRAIN', 'TRUCK', 'PLANE', 'FERRY', 'SUBWAY', 'BICYCLE', 'SCOOTER', 'TRACTOR'] },
  { id: 'sport', name: 'Sport', words: ['GOLF', 'SWIM', 'RACE', 'JUDO', 'RUGBY', 'CHESS', 'TENNIS', 'SOCCER', 'HOCKEY', 'BOXING', 'SKIING', 'ROWING', 'CRICKET', 'ARCHERY'] },
  { id: 'music', name: 'Music', words: ['DRUM', 'HARP', 'SONG', 'OBOE', 'FLUTE', 'PIANO', 'CELLO', 'ORGAN', 'BANJO', 'CHOIR', 'VIOLA', 'VIOLIN', 'GUITAR', 'TRUMPET'] },
  { id: 'food', name: 'Food', words: ['RICE', 'SOUP', 'CAKE', 'BREAD', 'PASTA', 'PIZZA', 'HONEY', 'SALAD', 'CHEESE', 'BUTTER', 'NOODLE', 'SANDWICH', 'PORRIDGE', 'OMELETTE'] },
  { id: 'drink', name: 'Drinks', words: ['TEA', 'MILK', 'WINE', 'BEER', 'SODA', 'JUICE', 'WATER', 'COCOA', 'CIDER', 'BROTH', 'PUNCH', 'COFFEE', 'LEMONADE', 'SMOOTHIE'] },
  { id: 'nature', name: 'Nature', words: ['HILL', 'LAKE', 'ROCK', 'SAND', 'RIVER', 'OCEAN', 'FIELD', 'FOREST', 'DESERT', 'VALLEY', 'ISLAND', 'MEADOW', 'STREAM', 'MOUNTAIN'] },
  { id: 'garden', name: 'The Garden', words: ['SEED', 'LEAF', 'ROOT', 'WEED', 'POND', 'VINE', 'GRASS', 'HEDGE', 'SPADE', 'SHRUB', 'FLOWER', 'BRANCH', 'BLOSSOM', 'COMPOST'] },
  { id: 'tool', name: 'Tools', words: ['SAW', 'NAIL', 'ROPE', 'DRILL', 'SCREW', 'RULER', 'BRUSH', 'HAMMER', 'PLIERS', 'WRENCH', 'CHISEL', 'LADDER', 'SHOVEL', 'SPANNER'] },
  { id: 'travel', name: 'Travel', words: ['MAP', 'PATH', 'TRIP', 'TOUR', 'HOTEL', 'BEACH', 'TICKET', 'CAMERA', 'CRUISE', 'AIRPORT', 'LUGGAGE', 'JOURNEY', 'STATION', 'PASSPORT'] },
  { id: 'health', name: 'Health', words: ['REST', 'WALK', 'DIET', 'SLEEP', 'HEART', 'BONES', 'PULSE', 'BREATH', 'MUSCLE', 'VITAMIN', 'CHECKUP', 'EXERCISE', 'MEDICINE', 'HOSPITAL'] },
  { id: 'party', name: 'Celebration', words: ['GIFT', 'CARD', 'PARTY', 'FEAST', 'GUEST', 'TOAST', 'DANCE', 'CANDLE', 'RIBBON', 'PARADE', 'BALLOON', 'PRESENT', 'WEDDING', 'BIRTHDAY'] }
];

/* 빈칸을 메울 글자 — 영어에서 흔한 글자가 더 자주 나오도록 겹쳐 적었다.
   드문 글자(Q·Z·X)만 늘어놓으면 글자판이 한눈에 어색해 보인다. */
window.WORD_FILLER_EN = (
  'EEEEEEEEEEEE' +
  'TTTTTTTTT' +
  'AAAAAAAA' +
  'OOOOOOO' +
  'IIIIIII' +
  'NNNNNN' +
  'SSSSSS' +
  'HHHHH' +
  'RRRRR' +
  'DDDD' +
  'LLLL' +
  'CCC' + 'UUU' + 'MM' + 'WW' + 'FF' + 'GG' + 'YY' + 'PP' + 'BB' +
  'VKJXQZ'
).split('');
