import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const playersData = [
  // --- CHENNAI SUPER KINGS ---
  { name: "Sanju Samson", role: "WK", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Ayush Mhatre", role: "Batsman", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Ruturaj Gaikwad", role: "Batsman", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Urvil Patel", role: "WK", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Shivam Dube", role: "All-rounder", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Dewald Brevis", role: "Batsman", country: "South Africa", baseTeam: "Chennai Super Kings" },
  { name: "Prashant Veer", role: "All-rounder", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "MS Dhoni", role: "WK", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Nathan Ellis", role: "Bowler", country: "Australia", baseTeam: "Chennai Super Kings" },
  { name: "Noor Ahmad", role: "Bowler", country: "Afghanistan", baseTeam: "Chennai Super Kings" },
  { name: "Matt Henry", role: "Bowler", country: "New Zealand", baseTeam: "Chennai Super Kings" },
  { name: "Khaleel Ahmed", role: "Bowler", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Jamie Overton", role: "All-rounder", country: "England", baseTeam: "Chennai Super Kings" },
  { name: "Akeal Hosein", role: "Bowler", country: "West Indies", baseTeam: "Chennai Super Kings" },
  { name: "Matt Short", role: "All-rounder", country: "Australia", baseTeam: "Chennai Super Kings" },
  { name: "Zak Foulkes", role: "Bowler", country: "New Zealand", baseTeam: "Chennai Super Kings" },
  { name: "Shreyas Gopal", role: "Bowler", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Ramakrishna Ghosh", role: "Bowler", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Gurjapneet Singh", role: "Bowler", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Mukesh Choudhary", role: "Bowler", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Kartik Sharma", role: "Batsman", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Anshul Kamboj", role: "Bowler", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Aman Khan", role: "All-rounder", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Sarfaraz Khan", role: "Batsman", country: "India", baseTeam: "Chennai Super Kings" },
  { name: "Rahul Chahar", role: "Bowler", country: "India", baseTeam: "Chennai Super Kings" },

  // --- DELHI CAPITALS ---
  { name: "KL Rahul", role: "WK", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Ben Duckett", role: "Batsman", country: "England", baseTeam: "Delhi Capitals" },
  { name: "Nitish Rana", role: "Batsman", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Sameer Rizvi", role: "Batsman", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Axar Patel", role: "All-rounder", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Tristan Stubbs", role: "WK", country: "South Africa", baseTeam: "Delhi Capitals" },
  { name: "David Miller", role: "Batsman", country: "South Africa", baseTeam: "Delhi Capitals" },
  { name: "Vipraj Nigam", role: "Bowler", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Auqib Nabi", role: "Bowler", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Kuldeep Yadav", role: "Bowler", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Mitchell Starc", role: "Bowler", country: "Australia", baseTeam: "Delhi Capitals" },
  { name: "T Natarajan", role: "Bowler", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Dushmantha Chameera", role: "Bowler", country: "Sri Lanka", baseTeam: "Delhi Capitals" },
  { name: "Pathum Nissanka", role: "Batsman", country: "Sri Lanka", baseTeam: "Delhi Capitals" },
  { name: "Lungi Ngidi", role: "Bowler", country: "South Africa", baseTeam: "Delhi Capitals" },
  { name: "Kyle Jamieson", role: "Bowler", country: "New Zealand", baseTeam: "Delhi Capitals" },
  { name: "Karun Nair", role: "Batsman", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Abhishek Porel", role: "WK", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Madhav Tiwari", role: "Bowler", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Tripurana Vijay", role: "All-rounder", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Ajay Mandal", role: "All-rounder", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Mukesh Kumar", role: "Bowler", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Ashutosh Sharma", role: "Batsman", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Sahil Parakh", role: "Batsman", country: "India", baseTeam: "Delhi Capitals" },
  { name: "Prithvi Shaw", role: "Batsman", country: "India", baseTeam: "Delhi Capitals" },

  // --- GUJARAT TITANS ---
  { name: "Shubman Gill", role: "Batsman", country: "India", baseTeam: "Gujarat Titans" },
  { name: "B Sai Sudharsan", role: "Batsman", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Jos Buttler", role: "WK", country: "England", baseTeam: "Gujarat Titans" },
  { name: "Washington Sundar", role: "All-rounder", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Glenn Phillips", role: "Batsman", country: "New Zealand", baseTeam: "Gujarat Titans" },
  { name: "Shahrukh Khan", role: "All-rounder", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Rahul Tewatia", role: "All-rounder", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Rashid Khan", role: "Bowler", country: "Afghanistan", baseTeam: "Gujarat Titans" },
  { name: "Kagiso Rabada", role: "Bowler", country: "South Africa", baseTeam: "Gujarat Titans" },
  { name: "Sai Kishore", role: "Bowler", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Prasidh Krishna", role: "Bowler", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Mohammed Siraj", role: "Bowler", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Jason Holder", role: "All-rounder", country: "West Indies", baseTeam: "Gujarat Titans" },
  { name: "Tom Banton", role: "WK", country: "England", baseTeam: "Gujarat Titans" },
  { name: "Luke Wood", role: "Bowler", country: "England", baseTeam: "Gujarat Titans" },
  { name: "Gurnoor Brar", role: "Bowler", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Arshad Khan", role: "All-rounder", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Manav Suthar", role: "Bowler", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Nishant Sindhu", role: "All-rounder", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Jayant Yadav", role: "All-rounder", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Ishant Sharma", role: "Bowler", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Kumar Kushagra", role: "WK", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Anuj Rawat", role: "WK", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Ashok Sharma", role: "Bowler", country: "India", baseTeam: "Gujarat Titans" },
  { name: "Prithviraj Yarra", role: "Bowler", country: "India", baseTeam: "Gujarat Titans" },

  // --- KOLKATA KNIGHT RIDERS ---
  { name: "Finn Allen", role: "Batsman", country: "New Zealand", baseTeam: "Kolkata Knight Riders" },
  { name: "Sunil Narine", role: "All-rounder", country: "West Indies", baseTeam: "Kolkata Knight Riders" },
  { name: "Ajinkya Rahane", role: "Batsman", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Angkrish Raghuvanshi", role: "Batsman", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Cameron Green", role: "All-rounder", country: "Australia", baseTeam: "Kolkata Knight Riders" },
  { name: "Rinku Singh", role: "Batsman", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Ramandeep Singh", role: "All-rounder", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Anukul Roy", role: "All-rounder", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Harshit Rana", role: "Bowler", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Varun Chakaravarthy", role: "Bowler", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Matheesha Pathirana", role: "Bowler", country: "Sri Lanka", baseTeam: "Kolkata Knight Riders" },
  { name: "Vaibhav Arora", role: "Bowler", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Rovman Powell", role: "Batsman", country: "West Indies", baseTeam: "Kolkata Knight Riders" },
  { name: "Tim Seifert", role: "WK", country: "New Zealand", baseTeam: "Kolkata Knight Riders" },
  { name: "Mustafizur Rahman", role: "Bowler", country: "Bangladesh", baseTeam: "Kolkata Knight Riders" },
  { name: "Rachin Ravindra", role: "All-rounder", country: "New Zealand", baseTeam: "Kolkata Knight Riders" },
  { name: "Umran Malik", role: "Bowler", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Manish Pandey", role: "Batsman", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Tejasvi Dahiya", role: "Batsman", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Kartik Tyagi", role: "Bowler", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Prashant Solanki", role: "Bowler", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Rahul Tripathi", role: "Batsman", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Sarthak Ranjan", role: "Batsman", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Daksh Kamra", role: "Bowler", country: "India", baseTeam: "Kolkata Knight Riders" },
  { name: "Akash Deep", role: "Bowler", country: "India", baseTeam: "Kolkata Knight Riders" },

  // --- LUCKNOW SUPER GIANTS ---
  { name: "Aiden Markram", role: "Batsman", country: "South Africa", baseTeam: "Lucknow Super Giants" },
  { name: "Mitchell Marsh", role: "All-rounder", country: "Australia", baseTeam: "Lucknow Super Giants" },
  { name: "Rishabh Pant", role: "WK", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Nicholas Pooran", role: "WK", country: "West Indies", baseTeam: "Lucknow Super Giants" },
  { name: "Ayush Badoni", role: "Batsman", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Abdul Samad", role: "Batsman", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Shahbaz Ahmed", role: "All-rounder", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Wanindu Hasaranga", role: "All-rounder", country: "Sri Lanka", baseTeam: "Lucknow Super Giants" },
  { name: "Mayank Yadav", role: "Bowler", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Digvesh Rathi", role: "Bowler", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Avesh Khan", role: "Bowler", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Mohammed Shami", role: "Bowler", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Matthew Breetzke", role: "Batsman", country: "South Africa", baseTeam: "Lucknow Super Giants" },
  { name: "Anrich Nortje", role: "Bowler", country: "South Africa", baseTeam: "Lucknow Super Giants" },
  { name: "Josh Inglis", role: "WK", country: "Australia", baseTeam: "Lucknow Super Giants" },
  { name: "Naman Tiwari", role: "Bowler", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "M Siddharth", role: "Bowler", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Arshin Kulkarni", role: "All-rounder", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Prince Yadav", role: "All-rounder", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Akash Singh", role: "Bowler", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Arjun Tendulkar", role: "All-rounder", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Himmat Singh", role: "Batsman", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Mohsin Khan", role: "Bowler", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Akshat Raghuwanshi", role: "Batsman", country: "India", baseTeam: "Lucknow Super Giants" },
  { name: "Mukul Choudhary", role: "Bowler", country: "India", baseTeam: "Lucknow Super Giants" },

  // --- MUMBAI INDIANS ---
  { name: "Rohit Sharma", role: "Batsman", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Quinton de Kock", role: "WK", country: "South Africa", baseTeam: "Mumbai Indians" },
  { name: "Will Jacks", role: "All-rounder", country: "England", baseTeam: "Mumbai Indians" },
  { name: "Suryakumar Yadav", role: "Batsman", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Tilak Varma", role: "Batsman", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Hardik Pandya", role: "All-rounder", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Naman Dhir", role: "All-rounder", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Mitchell Santner", role: "All-rounder", country: "New Zealand", baseTeam: "Mumbai Indians" },
  { name: "Deepak Chahar", role: "Bowler", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Trent Boult", role: "Bowler", country: "New Zealand", baseTeam: "Mumbai Indians" },
  { name: "Jasprit Bumrah", role: "Bowler", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Ashwani Kumar", role: "Bowler", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Sherfane Rutherford", role: "All-rounder", country: "West Indies", baseTeam: "Mumbai Indians" },
  { name: "Corbin Bosch", role: "All-rounder", country: "South Africa", baseTeam: "Mumbai Indians" },
  { name: "AM Ghazanfar", role: "Bowler", country: "Afghanistan", baseTeam: "Mumbai Indians" },
  { name: "Ryan Rickelton", role: "WK", country: "South Africa", baseTeam: "Mumbai Indians" },
  { name: "Robin Minz", role: "WK", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Raj Bawa", role: "All-rounder", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Shardul Thakur", role: "Bowler", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Raghu Sharma", role: "Bowler", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Mayank Markande", role: "Bowler", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Danish Malewar", role: "Batsman", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Mohammed Izhar", role: "Bowler", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Atharva Ankolekar", role: "All-rounder", country: "India", baseTeam: "Mumbai Indians" },
  { name: "Mayank Rawat", role: "Batsman", country: "India", baseTeam: "Mumbai Indians" },

  // --- PUNJAB KINGS ---
  { name: "Priyansh Arya", role: "Batsman", country: "India", baseTeam: "Punjab Kings" },
  { name: "Prabhsimran Singh", role: "WK", country: "India", baseTeam: "Punjab Kings" },
  { name: "Cooper Connolly", role: "All-rounder", country: "Australia", baseTeam: "Punjab Kings" },
  { name: "Shreyas Iyer", role: "Batsman", country: "India", baseTeam: "Punjab Kings" },
  { name: "Nehal Wadhera", role: "Batsman", country: "India", baseTeam: "Punjab Kings" },
  { name: "Marcus Stoinis", role: "All-rounder", country: "Australia", baseTeam: "Punjab Kings" },
  { name: "Shashank Singh", role: "Batsman", country: "India", baseTeam: "Punjab Kings" },
  { name: "Marco Jansen", role: "All-rounder", country: "South Africa", baseTeam: "Punjab Kings" },
  { name: "Harpreet Brar", role: "All-rounder", country: "India", baseTeam: "Punjab Kings" },
  { name: "Xavier Bartlett", role: "Bowler", country: "Australia", baseTeam: "Punjab Kings" },
  { name: "Arshdeep Singh", role: "Bowler", country: "India", baseTeam: "Punjab Kings" },
  { name: "Yuzvendra Chahal", role: "Bowler", country: "India", baseTeam: "Punjab Kings" },
  { name: "Lockie Ferguson", role: "Bowler", country: "New Zealand", baseTeam: "Punjab Kings" },
  { name: "Azmatullah Omarzai", role: "All-rounder", country: "Afghanistan", baseTeam: "Punjab Kings" },
  { name: "Mitch Owen", role: "All-rounder", country: "Australia", baseTeam: "Punjab Kings" },
  { name: "Ben Dwarshuis", role: "Bowler", country: "Australia", baseTeam: "Punjab Kings" },
  { name: "Vijayakumar Vyshak", role: "Bowler", country: "India", baseTeam: "Punjab Kings" },
  { name: "Yash Thakur", role: "Bowler", country: "India", baseTeam: "Punjab Kings" },
  { name: "Vishnu Vinod", role: "WK", country: "India", baseTeam: "Punjab Kings" },
  { name: "Suryansh Shedge", role: "Batsman", country: "India", baseTeam: "Punjab Kings" },
  { name: "Harnoor Singh", role: "Batsman", country: "India", baseTeam: "Punjab Kings" },
  { name: "Musheer Khan", role: "All-rounder", country: "India", baseTeam: "Punjab Kings" },
  { name: "Pyla Avinash", role: "Bowler", country: "India", baseTeam: "Punjab Kings" },
  { name: "Pravin Dubey", role: "All-rounder", country: "India", baseTeam: "Punjab Kings" },
  { name: "Vishal Nishad", role: "Bowler", country: "India", baseTeam: "Punjab Kings" },

  // --- RAJASTHAN ROYALS ---
  { name: "Yashasvi Jaiswal", role: "Batsman", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Vaibhav Suryavanshi", role: "Batsman", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Riyan Parag", role: "All-rounder", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Dhruv Jurel", role: "WK", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Sam Curran", role: "All-rounder", country: "England", baseTeam: "Rajasthan Royals" },
  { name: "Ravindra Jadeja", role: "All-rounder", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Shimron Hetmyer", role: "Batsman", country: "West Indies", baseTeam: "Rajasthan Royals" },
  { name: "Ravi Bishnoi", role: "Bowler", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Jofra Archer", role: "Bowler", country: "England", baseTeam: "Rajasthan Royals" },
  { name: "Nandre Burger", role: "Bowler", country: "South Africa", baseTeam: "Rajasthan Royals" },
  { name: "Tushar Deshpande", role: "Bowler", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Sandeep Sharma", role: "Bowler", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Donovan Ferreira", role: "All-rounder", country: "South Africa", baseTeam: "Rajasthan Royals" },
  { name: "Lhuan-dre Pretorius", role: "WK", country: "South Africa", baseTeam: "Rajasthan Royals" },
  { name: "Kwena Maphaka", role: "Bowler", country: "South Africa", baseTeam: "Rajasthan Royals" },
  { name: "Adam Milne", role: "Bowler", country: "New Zealand", baseTeam: "Rajasthan Royals" },
  { name: "Yudhvir Singh", role: "Bowler", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Shubham Dubey", role: "Batsman", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Sushant Mishra", role: "Bowler", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Yash Raj Punja", role: "Bowler", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Vignesh Puthur", role: "Bowler", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Ravi Singh", role: "Batsman", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Aman Rao", role: "Bowler", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Brijesh Sharma", role: "Bowler", country: "India", baseTeam: "Rajasthan Royals" },
  { name: "Kuldeep Sen", role: "Bowler", country: "India", baseTeam: "Rajasthan Royals" },

  // --- ROYAL CHALLENGERS BENGALURU ---
  { name: "Virat Kohli", role: "Batsman", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Phil Salt", role: "WK", country: "England", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Venkatesh Iyer", role: "All-rounder", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Rajat Patidar", role: "Batsman", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Tim David", role: "Batsman", country: "Australia", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Jitesh Sharma", role: "WK", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Romario Shepherd", role: "All-rounder", country: "West Indies", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Krunal Pandya", role: "All-rounder", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Suyash Sharma", role: "Bowler", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Bhuvneshwar Kumar", role: "Bowler", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Josh Hazlewood", role: "Bowler", country: "Australia", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Yash Dayal", role: "Bowler", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Jacob Bethell", role: "All-rounder", country: "England", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Nuwan Thushara", role: "Bowler", country: "Sri Lanka", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Jacob Duffy", role: "Bowler", country: "New Zealand", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Jordan Cox", role: "WK", country: "England", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Rasikh Salam", role: "Bowler", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Swapnil Singh", role: "All-rounder", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Abhinandan Singh", role: "Bowler", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Devdutt Padikkal", role: "Batsman", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Mangesh Yadav", role: "All-rounder", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Satwik Deswal", role: "Bowler", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Vicky Ostwal", role: "Bowler", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Vihaan Malhotra", role: "Batsman", country: "India", baseTeam: "Royal Challengers Bengaluru" },
  { name: "Kanishk Chouhan", role: "Bowler", country: "India", baseTeam: "Royal Challengers Bengaluru" },

  // --- SUNRISERS HYDERABAD ---
  { name: "Travis Head", role: "Batsman", country: "Australia", baseTeam: "Sunrisers Hyderabad" },
  { name: "Abhishek Sharma", role: "All-rounder", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Ishan Kishan", role: "WK", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Heinrich Klaasen", role: "WK", country: "South Africa", baseTeam: "Sunrisers Hyderabad" },
  { name: "Nitish Kumar Reddy", role: "All-rounder", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Aniket Verma", role: "Batsman", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Liam Livingstone", role: "All-rounder", country: "England", baseTeam: "Sunrisers Hyderabad" },
  { name: "Patrick Cummins", role: "Bowler", country: "Australia", baseTeam: "Sunrisers Hyderabad" },
  { name: "Harsh Dubey", role: "Bowler", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Harshal Patel", role: "Bowler", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Shivam Mavi", role: "Bowler", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Jaydev Unadkat", role: "Bowler", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Eshan Malinga", role: "Bowler", country: "Sri Lanka", baseTeam: "Sunrisers Hyderabad" },
  { name: "Kamindu Mendis", role: "All-rounder", country: "Sri Lanka", baseTeam: "Sunrisers Hyderabad" },
  { name: "Brydon Carse", role: "Bowler", country: "England", baseTeam: "Sunrisers Hyderabad" },
  { name: "Jack Edwards", role: "All-rounder", country: "Australia", baseTeam: "Sunrisers Hyderabad" },
  { name: "R Smaran", role: "Batsman", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Zeeshan Ansari", role: "Bowler", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Shivang Kumar", role: "Bowler", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Salil Arora", role: "WK", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Amit Kumar", role: "All-rounder", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Omkar Tarnale", role: "Bowler", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Sakib Hussain", role: "Bowler", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Praful Hinge", role: "Bowler", country: "India", baseTeam: "Sunrisers Hyderabad" },
  { name: "Krains Fuletra", role: "Bowler", country: "India", baseTeam: "Sunrisers Hyderabad" }
];

async function main() {
  console.log("Commencing massive database seeding...");
  
  // Clear existing to prevent duplicates
  await prisma.player.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.room.deleteMany({});
  console.log("Cleared old players, teams, and rooms...");

  // Create a persistent Global Dashboard Room
  const globalRoom = await prisma.room.create({
    data: {
      code: "GLOBAL_DASHBOARD",
      adminUserId: "sys_admin",
      status: "COMPLETED"
    }
  });

  // Seed standard 10 teams
  const standardTeams = [
    { displayName: "Chennai Super Kings", shortName: "CSK", code: "CSK", primaryColor: "#F9CD05", secondaryColor: "#000000", roomId: globalRoom.id },
    { displayName: "Mumbai Indians", shortName: "MI", code: "MI", primaryColor: "#004BA0", secondaryColor: "#D1AB3E", roomId: globalRoom.id },
    { displayName: "Royal Challengers Bengaluru", shortName: "RCB", code: "RCB", primaryColor: "#2B2A29", secondaryColor: "#D11D1D", roomId: globalRoom.id },
    { displayName: "Kolkata Knight Riders", shortName: "KKR", code: "KKR", primaryColor: "#3A225D", secondaryColor: "#F2D159", roomId: globalRoom.id },
    { displayName: "Sunrisers Hyderabad", shortName: "SRH", code: "SRH", primaryColor: "#FF822A", secondaryColor: "#000000", roomId: globalRoom.id },
    { displayName: "Rajasthan Royals", shortName: "RR", code: "RR", primaryColor: "#EA1A85", secondaryColor: "#254AA5", roomId: globalRoom.id },
    { displayName: "Delhi Capitals", shortName: "DC", code: "DC", primaryColor: "#004C93", secondaryColor: "#EF1B23", roomId: globalRoom.id },
    { displayName: "Punjab Kings", shortName: "PBKS", code: "PBKS", primaryColor: "#ED1B24", secondaryColor: "#D7C15G", roomId: globalRoom.id },
    { displayName: "Lucknow Super Giants", shortName: "LSG", code: "LSG", primaryColor: "#254AA5", secondaryColor: "#F9CD05", roomId: globalRoom.id },
    { displayName: "Gujarat Titans", shortName: "GT", code: "GT", primaryColor: "#1B2133", secondaryColor: "#B59E5D", roomId: globalRoom.id }
  ];

  await prisma.team.createMany({
    data: standardTeams
  });
  console.log("Seeded 10 permanent IPL Franchises.");

  // Map the strict schema enums and default basePrice
  const formattedPlayersData = playersData.map(player => ({
    ...player,
    basePrice: 50, // Force default 50L base price
    // Map to strict Prisma enums: INDIAN or FOREIGN
    countryType: player.country === "India" ? "INDIAN" : "FOREIGN" 
  }));

  // Insert all 250 players
  const createdPlayers = await prisma.player.createMany({
    data: formattedPlayersData,
  });

  console.log(`✅ Success! Inserted ${createdPlayers.count} players into the Neon database.`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });