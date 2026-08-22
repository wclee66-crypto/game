/* 새록 — 상식 퀴즈 문제 은행 (영어판)
 *
 * 구조는 js/data/quiz-data.js 와 똑같다.
 *   c: 분야, q: 문제, a: 보기(4개), k: 정답 번호(0부터), d: 난이도
 *   d = 1 쉬움 · 2 보통 · 3 어려움
 *
 * 여기의 글은 T() 로 감싸지 않는다. 영어에서만 쓰이는 자료라 옮길 일이 없다.
 * (한국어 문제 은행과 서로 섞이지 않는다 — 말을 바꾸면 은행도 통째로 바뀐다.)
 *
 * 나라를 가리지 않고 답할 수 있는 문제로 고른다.
 * 어느 한 나라에서만 통하는 상식(그 나라 방송·정치·전화번호 따위)은 넣지 않는다.
 */
window.QUIZ_DATA_EN = {
  categories: [
    { id: 'all',      name: 'All' },
    { id: 'History',  name: 'History' },
    { id: 'Sayings',  name: 'Sayings' },
    { id: 'Nature',   name: 'Nature' },
    { id: 'Everyday', name: 'Everyday' },
    { id: 'Culture',  name: 'Culture' },
    { id: 'General',  name: 'General' }
  ],
  items: [
    /* ---------------- History ---------------- */
    { c: 'History', q: 'Who was the first person to walk on the Moon?', a: ['Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'John Glenn'], k: 0, d: 1 },
    { c: 'History', q: 'In which year did the Second World War end?', a: ['1945', '1918', '1939', '1950'], k: 0, d: 1 },
    { c: 'History', q: 'Which ancient people built the pyramids at Giza?', a: ['The Egyptians', 'The Romans', 'The Greeks', 'The Persians'], k: 0, d: 1 },
    { c: 'History', q: 'Who led Britain through most of the Second World War?', a: ['Winston Churchill', 'Neville Chamberlain', 'Clement Attlee', 'Anthony Eden'], k: 0, d: 1 },
    { c: 'History', q: 'Which great ship sank on its first voyage in 1912?', a: ['The Titanic', 'The Lusitania', 'The Mayflower', 'The Bismarck'], k: 0, d: 1 },
    { c: 'History', q: "Who led India's non-violent independence movement?", a: ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Rabindranath Tagore', 'Indira Gandhi'], k: 0, d: 1 },
    { c: 'History', q: 'In which country is the Great Wall?', a: ['China', 'Japan', 'India', 'Mongolia'], k: 0, d: 1 },
    { c: 'History', q: 'Which wall divided a German city until 1989?', a: ['The Berlin Wall', "Hadrian's Wall", 'The Great Wall', 'The Western Wall'], k: 0, d: 1 },
    { c: 'History', q: 'Who was the first President of the United States?', a: ['George Washington', 'Abraham Lincoln', 'Thomas Jefferson', 'John Adams'], k: 0, d: 1 },
    /* 보통 */
    { c: 'History', q: 'Which war was fought between 1914 and 1918?', a: ['The First World War', 'The Second World War', 'The Korean War', 'The Crimean War'], k: 0, d: 2 },
    { c: 'History', q: 'Who was Queen of the United Kingdom from 1952 to 2022?', a: ['Elizabeth II', 'Victoria', 'Elizabeth I', 'Anne'], k: 0, d: 2 },
    { c: 'History', q: 'Christopher Columbus sailed in 1492 for which country?', a: ['Spain', 'Portugal', 'Italy', 'England'], k: 0, d: 2 },
    { c: 'History', q: 'Which French leader was defeated at Waterloo in 1815?', a: ['Napoleon Bonaparte', 'Louis XVI', 'Charles de Gaulle', 'Maximilien Robespierre'], k: 0, d: 2 },
    { c: 'History', q: 'Nelson Mandela became president of which country in 1994?', a: ['South Africa', 'Kenya', 'Nigeria', 'Zimbabwe'], k: 0, d: 2 },
    { c: 'History', q: 'In which year did the Berlin Wall come down?', a: ['1989', '1979', '1991', '1985'], k: 0, d: 2 },
    { c: 'History', q: 'Which American president signed the Emancipation Proclamation?', a: ['Abraham Lincoln', 'George Washington', 'Andrew Jackson', 'Ulysses S. Grant'], k: 0, d: 2 },
    /* 어려움 */
    { c: 'History', q: 'Which treaty ended the First World War in 1919?', a: ['The Treaty of Versailles', 'The Treaty of Utrecht', 'The Treaty of Ghent', 'The Treaty of Vienna'], k: 0, d: 3 },
    { c: 'History', q: 'Who was the first woman to win a Nobel Prize?', a: ['Marie Curie', 'Florence Nightingale', 'Mother Teresa', 'Pearl Buck'], k: 0, d: 3 },
    { c: 'History', q: 'Which city was the capital of the Byzantine Empire?', a: ['Constantinople', 'Athens', 'Rome', 'Alexandria'], k: 0, d: 3 },
    { c: 'History', q: 'In which year did the French Revolution begin?', a: ['1789', '1776', '1815', '1848'], k: 0, d: 3 },
    { c: 'History', q: 'Who wrote the Ninety-five Theses that began the Reformation?', a: ['Martin Luther', 'John Calvin', 'Erasmus', 'Henry VIII'], k: 0, d: 3 },
    { c: 'History', q: 'Which queen was the last ruler of ancient Egypt?', a: ['Cleopatra VII', 'Nefertiti', 'Hatshepsut', 'Boudicca'], k: 0, d: 3 },
    { c: 'History', q: 'Magna Carta was sealed by which English king in 1215?', a: ['King John', 'Henry VIII', 'Richard I', 'Edward I'], k: 0, d: 3 },
    { c: 'History', q: "Whose crew was the first to sail all the way around the world?", a: ['Ferdinand Magellan', 'Vasco da Gama', 'James Cook', 'Francis Drake'], k: 0, d: 3 },

    /* ---------------- Sayings ---------------- */
    { c: 'Sayings', q: 'Finish the saying: "Better late than ___."', a: ['never', 'sorry', 'early', 'done'], k: 0, d: 1 },
    { c: 'Sayings', q: '"An apple a day keeps the ___ away."', a: ['doctor', 'winter', 'cold', 'hunger'], k: 0, d: 1 },
    { c: 'Sayings', q: '"Practice makes ___."', a: ['perfect', 'better', 'easy', 'money'], k: 0, d: 1 },
    { c: 'Sayings', q: '"Do not judge a book by its ___."', a: ['cover', 'title', 'price', 'author'], k: 0, d: 1 },
    { c: 'Sayings', q: '"The early bird catches the ___."', a: ['worm', 'train', 'sun', 'fish'], k: 0, d: 1 },
    { c: 'Sayings', q: '"Two heads are better than ___."', a: ['one', 'none', 'three', 'many'], k: 0, d: 1 },
    { c: 'Sayings', q: '"Home sweet ___."', a: ['home', 'house', 'place', 'heart'], k: 0, d: 1 },
    { c: 'Sayings', q: '"Every cloud has a ___ lining."', a: ['silver', 'golden', 'bright', 'white'], k: 0, d: 1 },
    { c: 'Sayings', q: '"Actions speak louder than ___."', a: ['words', 'thoughts', 'money', 'promises'], k: 0, d: 1 },
    /* 보통 */
    { c: 'Sayings', q: '"A stitch in time saves ___."', a: ['nine', 'ten', 'five', 'time'], k: 0, d: 2 },
    { c: 'Sayings', q: '"Too many cooks spoil the ___."', a: ['broth', 'kitchen', 'dinner', 'pot'], k: 0, d: 2 },
    { c: 'Sayings', q: '"You cannot teach an old dog new ___."', a: ['tricks', 'names', 'habits', 'games'], k: 0, d: 2 },
    { c: 'Sayings', q: 'What does "to bite the bullet" mean?', a: ['To face something painful bravely', 'To speak in anger', 'To eat too quickly', 'To waste money'], k: 0, d: 2 },
    { c: 'Sayings', q: 'What does "once in a blue moon" mean?', a: ['Very rarely', 'Every month', 'Only at night', 'All of a sudden'], k: 0, d: 2 },
    { c: 'Sayings', q: '"Let sleeping dogs ___."', a: ['lie', 'rest', 'sleep', 'be'], k: 0, d: 2 },
    /* 어려움 */
    { c: 'Sayings', q: 'What does "a red herring" mean?', a: ['Something that leads you off the track', 'A rare fish', 'A warning sign', 'A lucky charm'], k: 0, d: 3 },
    { c: 'Sayings', q: '"Do not count your chickens before they ___."', a: ['hatch', 'grow', 'lay', 'fly'], k: 0, d: 3 },
    { c: 'Sayings', q: 'What does "the eleventh hour" mean?', a: ['The very last moment', 'Late at night', 'A long wait', 'An early start'], k: 0, d: 3 },
    { c: 'Sayings', q: 'What does "to throw in the towel" mean?', a: ['To give up', 'To tidy up', 'To start again', 'To celebrate'], k: 0, d: 3 },
    { c: 'Sayings', q: '"A rolling stone gathers no ___."', a: ['moss', 'dust', 'friends', 'speed'], k: 0, d: 3 },
    { c: 'Sayings', q: 'What does "to steal someone’s thunder" mean?', a: ['To take the praise they deserved', 'To copy their voice', 'To borrow money', 'To arrive too early'], k: 0, d: 3 },
    { c: 'Sayings', q: 'What does "to burn the midnight oil" mean?', a: ['To work late into the night', 'To waste money', 'To cook very slowly', 'To lose your temper'], k: 0, d: 3 },

    /* ---------------- Nature ---------------- */
    { c: 'Nature', q: 'What is the largest animal on Earth?', a: ['The blue whale', 'The elephant', 'The giraffe', 'The great white shark'], k: 0, d: 1 },
    { c: 'Nature', q: 'How many legs does a spider have?', a: ['Eight', 'Six', 'Ten', 'Four'], k: 0, d: 1 },
    { c: 'Nature', q: 'Which gas do people need to breathe in to stay alive?', a: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], k: 0, d: 1 },
    { c: 'Nature', q: 'Which is the tallest land animal?', a: ['The giraffe', 'The elephant', 'The camel', 'The horse'], k: 0, d: 1 },
    { c: 'Nature', q: 'What do bees make?', a: ['Honey', 'Milk', 'Silk', 'Wool'], k: 0, d: 1 },
    { c: 'Nature', q: 'At what temperature does water freeze, in Celsius?', a: ['0 degrees', '10 degrees', '100 degrees', 'Minus 10 degrees'], k: 0, d: 1 },
    { c: 'Nature', q: 'Which season comes after summer?', a: ['Autumn', 'Spring', 'Winter', 'Midsummer'], k: 0, d: 1 },
    { c: 'Nature', q: 'Which star is closest to the Earth?', a: ['The Sun', 'The Moon', 'Polaris', 'Sirius'], k: 0, d: 1 },
    { c: 'Nature', q: 'Where does a caterpillar turn into a butterfly?', a: ['In a cocoon', 'In an egg', 'In a nest', 'Under water'], k: 0, d: 1 },
    /* 보통 */
    { c: 'Nature', q: 'Which planet is known as the Red Planet?', a: ['Mars', 'Venus', 'Jupiter', 'Mercury'], k: 0, d: 2 },
    { c: 'Nature', q: 'Which is the largest ocean on Earth?', a: ['The Pacific', 'The Atlantic', 'The Indian', 'The Arctic'], k: 0, d: 2 },
    { c: 'Nature', q: 'Which organ pumps blood around the body?', a: ['The heart', 'The liver', 'The lungs', 'The kidneys'], k: 0, d: 2 },
    { c: 'Nature', q: 'How many bones are there in a grown-up human body?', a: ['206', '106', '306', '406'], k: 0, d: 2 },
    { c: 'Nature', q: 'Which tree grows from an acorn?', a: ['The oak', 'The pine', 'The birch', 'The willow'], k: 0, d: 2 },
    { c: 'Nature', q: 'Which river is usually said to be the longest in the world?', a: ['The Nile', 'The Danube', 'The Yangtze', 'The Mississippi'], k: 0, d: 2 },
    { c: 'Nature', q: 'Which animal is famous for changing its colour?', a: ['The chameleon', 'The zebra', 'The parrot', 'The tortoise'], k: 0, d: 2 },
    /* 어려움 */
    { c: 'Nature', q: 'What is the chemical symbol for gold?', a: ['Au', 'Go', 'Ag', 'Gd'], k: 0, d: 3 },
    { c: 'Nature', q: 'Which scientist explained gravity after watching an apple fall?', a: ['Isaac Newton', 'Albert Einstein', 'Galileo Galilei', 'Charles Darwin'], k: 0, d: 3 },
    { c: 'Nature', q: 'Which is the hardest natural substance?', a: ['Diamond', 'Granite', 'Steel', 'Quartz'], k: 0, d: 3 },
    { c: 'Nature', q: 'How long does sunlight take to reach the Earth?', a: ['About 8 minutes', 'About 8 seconds', 'About 8 hours', 'About 8 days'], k: 0, d: 3 },
    { c: 'Nature', q: 'Which gas do plants take in to make their food?', a: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'], k: 0, d: 3 },
    { c: 'Nature', q: 'Which mountain is the highest above sea level?', a: ['Mount Everest', 'K2', 'Mont Blanc', 'Kilimanjaro'], k: 0, d: 3 },
    { c: 'Nature', q: 'Which blood type is called the universal donor?', a: ['O negative', 'AB positive', 'A positive', 'B negative'], k: 0, d: 3 },
    { c: 'Nature', q: 'How many chambers does the human heart have?', a: ['Four', 'Two', 'Three', 'Six'], k: 0, d: 3 },

    /* ---------------- Everyday ---------------- */
    { c: 'Everyday', q: 'How many days are there in a leap year?', a: ['366', '365', '364', '367'], k: 0, d: 1 },
    { c: 'Everyday', q: 'How many hours are there in two days?', a: ['48', '24', '36', '60'], k: 0, d: 1 },
    { c: 'Everyday', q: 'Which meal is usually eaten in the morning?', a: ['Breakfast', 'Dinner', 'Supper', 'Lunch'], k: 0, d: 1 },
    { c: 'Everyday', q: 'What should you do before eating to keep germs away?', a: ['Wash your hands', 'Comb your hair', 'Open a window', 'Turn on the light'], k: 0, d: 1 },
    { c: 'Everyday', q: 'How many minutes are there in an hour and a half?', a: ['90', '60', '100', '120'], k: 0, d: 1 },
    { c: 'Everyday', q: 'Which drink is best for quenching thirst?', a: ['Water', 'Coffee', 'Cola', 'Wine'], k: 0, d: 1 },
    { c: 'Everyday', q: 'Apples and bananas belong to which food group?', a: ['Fruit', 'Meat', 'Dairy', 'Grain'], k: 0, d: 1 },
    { c: 'Everyday', q: 'Which of these is a vegetable?', a: ['A carrot', 'An apple', 'Rice', 'An egg'], k: 0, d: 1 },
    { c: 'Everyday', q: 'What do we call the meal eaten in the middle of the day?', a: ['Lunch', 'Breakfast', 'Supper', 'Dessert'], k: 0, d: 1 },
    /* 보통 */
    { c: 'Everyday', q: 'How many days are there in a fortnight?', a: ['14', '7', '10', '30'], k: 0, d: 2 },
    { c: 'Everyday', q: 'Which vitamin does your body make from sunlight?', a: ['Vitamin D', 'Vitamin C', 'Vitamin A', 'Vitamin B12'], k: 0, d: 2 },
    { c: 'Everyday', q: 'Which of these exercises is gentlest on the knees?', a: ['Swimming', 'Running', 'Skipping rope', 'Climbing stairs'], k: 0, d: 2 },
    { c: 'Everyday', q: 'What does a thermometer measure?', a: ['Temperature', 'Weight', 'Time', 'Distance'], k: 0, d: 2 },
    { c: 'Everyday', q: 'Bread and rice are mainly made of which nutrient?', a: ['Carbohydrate', 'Protein', 'Fat', 'Vitamins'], k: 0, d: 2 },
    { c: 'Everyday', q: 'How many millilitres are there in one litre?', a: ['1,000', '100', '10', '10,000'], k: 0, d: 2 },
    { c: 'Everyday', q: 'How many grams are there in one kilogram?', a: ['1,000', '100', '500', '10,000'], k: 0, d: 2 },
    /* 어려움 */
    { c: 'Everyday', q: 'A blood pressure of 120 over 80 is usually called what?', a: ['A normal reading', 'A high reading', 'A low reading', 'A pulse rate'], k: 0, d: 3 },
    { c: 'Everyday', q: 'Which mineral matters most for strong bones?', a: ['Calcium', 'Iron', 'Zinc', 'Sodium'], k: 0, d: 3 },
    { c: 'Everyday', q: 'Eating too much of which seasoning raises blood pressure?', a: ['Salt', 'Pepper', 'Vinegar', 'Cinnamon'], k: 0, d: 3 },
    { c: 'Everyday', q: 'Oranges and lemons are richest in which vitamin?', a: ['Vitamin C', 'Vitamin D', 'Vitamin K', 'Vitamin E'], k: 0, d: 3 },
    { c: 'Everyday', q: 'How many hours of sleep a night are recommended for adults?', a: ['7 to 9', '3 to 4', '10 to 12', '12 to 14'], k: 0, d: 3 },
    { c: 'Everyday', q: 'What is a normal resting heartbeat for most adults?', a: ['60 to 100 a minute', '20 to 40 a minute', '120 to 160 a minute', '150 to 200 a minute'], k: 0, d: 3 },

    /* ---------------- Culture ---------------- */
    { c: 'Culture', q: 'Who wrote the play "Romeo and Juliet"?', a: ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'], k: 0, d: 1 },
    { c: 'Culture', q: 'How many strings does an ordinary guitar have?', a: ['Six', 'Four', 'Eight', 'Twelve'], k: 0, d: 1 },
    { c: 'Culture', q: 'Which instrument has black and white keys?', a: ['The piano', 'The violin', 'The flute', 'The drum'], k: 0, d: 1 },
    { c: 'Culture', q: 'In which country did the Olympic Games begin?', a: ['Greece', 'Italy', 'France', 'Egypt'], k: 0, d: 1 },
    { c: 'Culture', q: 'How many players from one team are on a football pitch?', a: ['Eleven', 'Nine', 'Seven', 'Thirteen'], k: 0, d: 1 },
    { c: 'Culture', q: 'Which painter is famous for the Mona Lisa?', a: ['Leonardo da Vinci', 'Vincent van Gogh', 'Pablo Picasso', 'Michelangelo'], k: 0, d: 1 },
    { c: 'Culture', q: 'How many colours are usually counted in a rainbow?', a: ['Seven', 'Five', 'Six', 'Nine'], k: 0, d: 1 },
    { c: 'Culture', q: 'Which tower is the best-known landmark of Paris?', a: ['The Eiffel Tower', 'Big Ben', 'The Colosseum', 'The Taj Mahal'], k: 0, d: 1 },
    /* 보통 */
    { c: 'Culture', q: 'Who painted "The Starry Night"?', a: ['Vincent van Gogh', 'Claude Monet', 'Salvador Dalí', 'Paul Cézanne'], k: 0, d: 2 },
    { c: 'Culture', q: 'In which country is the Taj Mahal?', a: ['India', 'Pakistan', 'Iran', 'Turkey'], k: 0, d: 2 },
    { c: 'Culture', q: 'Who wrote "Oliver Twist"?', a: ['Charles Dickens', 'Leo Tolstoy', 'Victor Hugo', 'Thomas Hardy'], k: 0, d: 2 },
    { c: 'Culture', q: 'How often are the Summer Olympic Games held?', a: ['Every four years', 'Every two years', 'Every year', 'Every five years'], k: 0, d: 2 },
    { c: 'Culture', q: 'Which composer went deaf in his later years?', a: ['Ludwig van Beethoven', 'Wolfgang Mozart', 'Johann Sebastian Bach', 'Franz Schubert'], k: 0, d: 2 },
    { c: 'Culture', q: 'In chess, which piece moves only in a diagonal line?', a: ['The bishop', 'The rook', 'The knight', 'The pawn'], k: 0, d: 2 },
    { c: 'Culture', q: 'Which city hosts the Wimbledon tennis tournament?', a: ['London', 'Paris', 'New York', 'Melbourne'], k: 0, d: 2 },
    { c: 'Culture', q: 'In which city would you find the Colosseum?', a: ['Rome', 'Athens', 'Istanbul', 'Naples'], k: 0, d: 2 },
    /* 어려움 */
    { c: 'Culture', q: 'Who carved the statue of David in Florence?', a: ['Michelangelo', 'Donatello', 'Raphael', 'Gian Lorenzo Bernini'], k: 0, d: 3 },
    { c: 'Culture', q: 'Which novel begins "It was the best of times, it was the worst of times"?', a: ['A Tale of Two Cities', 'Great Expectations', 'Bleak House', 'Hard Times'], k: 0, d: 3 },
    { c: 'Culture', q: 'Who composed the opera "The Magic Flute"?', a: ['Wolfgang Mozart', 'Giuseppe Verdi', 'Richard Wagner', 'Giacomo Puccini'], k: 0, d: 3 },
    { c: 'Culture', q: 'Noh and Kabuki are traditional theatre of which country?', a: ['Japan', 'China', 'Korea', 'Thailand'], k: 0, d: 3 },
    { c: 'Culture', q: 'Who wrote "Don Quixote"?', a: ['Miguel de Cervantes', 'Dante Alighieri', 'Gabriel García Márquez', 'Lope de Vega'], k: 0, d: 3 },
    { c: 'Culture', q: 'Which museum in Paris holds the Mona Lisa?', a: ['The Louvre', 'The Prado', 'The Uffizi', 'The Hermitage'], k: 0, d: 3 },
    { c: 'Culture', q: 'In written music, how many lines does a stave have?', a: ['Five', 'Four', 'Six', 'Three'], k: 0, d: 3 },

    /* ---------------- General ---------------- */
    { c: 'General', q: 'How many months of the year have 31 days?', a: ['Seven', 'Six', 'Five', 'Eight'], k: 0, d: 1 },
    { c: 'General', q: 'Mixing blue and yellow paint gives which colour?', a: ['Green', 'Purple', 'Orange', 'Brown'], k: 0, d: 1 },
    { c: 'General', q: 'How many sides does a triangle have?', a: ['Three', 'Four', 'Five', 'Two'], k: 0, d: 1 },
    { c: 'General', q: 'In which direction does the sun rise?', a: ['The east', 'The west', 'The north', 'The south'], k: 0, d: 1 },
    { c: 'General', q: 'How many letters are there in the English alphabet?', a: ['26', '24', '28', '30'], k: 0, d: 1 },
    { c: 'General', q: 'Which of these is a continent?', a: ['Africa', 'Egypt', 'Brazil', 'Norway'], k: 0, d: 1 },
    { c: 'General', q: 'What is the capital of France?', a: ['Paris', 'Lyon', 'Marseille', 'Nice'], k: 0, d: 1 },
    { c: 'General', q: 'How many minutes are there in a quarter of an hour?', a: ['15', '20', '25', '30'], k: 0, d: 1 },
    { c: 'General', q: 'Which shape has four equal sides and four right angles?', a: ['A square', 'A rectangle', 'A triangle', 'A circle'], k: 0, d: 1 },
    /* 보통 */
    { c: 'General', q: 'What is the capital of Australia?', a: ['Canberra', 'Sydney', 'Melbourne', 'Perth'], k: 0, d: 2 },
    { c: 'General', q: 'How many degrees are there in a full circle?', a: ['360', '180', '90', '270'], k: 0, d: 2 },
    { c: 'General', q: 'Which country is the largest by land area?', a: ['Russia', 'Canada', 'China', 'The United States'], k: 0, d: 2 },
    { c: 'General', q: 'Which money is used in Japan?', a: ['The yen', 'The won', 'The yuan', 'The baht'], k: 0, d: 2 },
    { c: 'General', q: 'Which sea is so salty that people float in it?', a: ['The Dead Sea', 'The Red Sea', 'The Black Sea', 'The Caspian Sea'], k: 0, d: 2 },
    { c: 'General', q: 'How many players from one team are on a basketball court?', a: ['Five', 'Six', 'Seven', 'Four'], k: 0, d: 2 },
    { c: 'General', q: 'How many days are there in the month of February in an ordinary year?', a: ['28', '29', '30', '31'], k: 0, d: 2 },
    /* 어려움 */
    { c: 'General', q: 'What is the capital of Canada?', a: ['Ottawa', 'Toronto', 'Vancouver', 'Montreal'], k: 0, d: 3 },
    { c: 'General', q: 'Which country gave the Statue of Liberty to the United States?', a: ['France', 'England', 'Spain', 'Italy'], k: 0, d: 3 },
    { c: 'General', q: 'How many time zones does Russia stretch across?', a: ['Eleven', 'Five', 'Eight', 'Fifteen'], k: 0, d: 3 },
    { c: 'General', q: 'Which is the smallest country in the world?', a: ['Vatican City', 'Monaco', 'San Marino', 'Malta'], k: 0, d: 3 },
    { c: 'General', q: 'In a web address, what does "www" stand for?', a: ['World Wide Web', 'Wide World Web', 'World Web Wide', 'Web World Wide'], k: 0, d: 3 },
    { c: 'General', q: 'Which is the largest hot desert in the world?', a: ['The Sahara', 'The Gobi', 'The Kalahari', 'The Arabian'], k: 0, d: 3 },
    { c: 'General', q: 'Which language has the most native speakers?', a: ['Mandarin Chinese', 'English', 'Spanish', 'Hindi'], k: 0, d: 3 },
    { c: 'General', q: 'What is the capital of Brazil?', a: ['Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'], k: 0, d: 3 }
  ]
};
