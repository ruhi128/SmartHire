// src/pages/student/MockOA.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  Clock, Search, Building2, ChevronLeft, ChevronRight,
  Send, AlertTriangle, CheckCircle, XCircle, BarChart2,
  Eye, EyeOff, Flag, RefreshCw, TrendingUp, Award,
  Code2, Brain, Cpu, Database, Globe, Layers,
  Monitor, Wifi, BookOpen, Star, Sparkles
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import toast from 'react-hot-toast';

// ─── OA_BANK (hardcoded platform tests — unchanged, trimmed for brevity) ───
const OA_BANK = {
  tcs_apt: {
    id: 'tcs_apt', title: 'TCS NQT – Aptitude & Reasoning', company: 'TCS',
    type: 'aptitude', duration: 40, totalMarks: 80,
    sections: ['Numerical Ability', 'Verbal Ability', 'Logical Reasoning'],
    questions: [
      { id:'ta1', section:'Numerical Ability', type:'mcq', marks:2, text:'A train 300m long passes a 200m station in 25 seconds. Speed of train?', opts:['60 km/h','72 km/h','80 km/h','90 km/h'], ans:1, explanation:'500m/25s=20m/s=72km/h' },
      { id:'ta2', section:'Numerical Ability', type:'mcq', marks:2, text:'12 men complete work in 16 days. Days for 8 men?', opts:['20','24','18','22'], ans:1, explanation:'12x16=8xD => D=24' },
      { id:'ta3', section:'Numerical Ability', type:'mcq', marks:2, text:'Shopkeeper marks 25% above CP, allows 10% discount. Profit %?', opts:['12%','12.5%','15%','10%'], ans:1, explanation:'SP=1.25Cx0.9=1.125C, Profit=12.5%' },
      { id:'ta4', section:'Numerical Ability', type:'mcq', marks:2, text:'Two pipes A(20 min) and B(30 min) fill a tank. Time together?', opts:['10 min','12 min','15 min','8 min'], ans:1, explanation:'Rate=1/20+1/30=1/12, Time=12 min' },
      { id:'ta5', section:'Numerical Ability', type:'mcq', marks:2, text:'SI on Rs.1000 for 2 years is Rs.160. Rate per annum?', opts:['6%','7%','8%','9%'], ans:2, explanation:'160=1000xRx2/100 => R=8%' },
      { id:'ta6', section:'Logical Reasoning', type:'mcq', marks:2, text:'Next in series: 2, 6, 18, 54, ?', opts:['108','162','216','132'], ans:1, explanation:'Each x3: 54x3=162' },
      { id:'ta7', section:'Logical Reasoning', type:'mcq', marks:2, text:'A is B\'s sister. C is B\'s mother. D is C\'s father. How is A related to D?', opts:['Granddaughter','Daughter','Great granddaughter','Niece'], ans:0, explanation:'A and B siblings, C mother, D=C\'s father=A\'s grandfather -> Granddaughter' },
      { id:'ta8', section:'Verbal Ability', type:'mcq', marks:2, text:'Opposite of VERBOSE?', opts:['Quiet','Succinct','Silent','Dumb'], ans:1, explanation:'Verbose=too wordy. Succinct=brief and clear.' },
      { id:'ta9', section:'Verbal Ability', type:'mcq', marks:2, text:'Synonym of GREGARIOUS?', opts:['Solitary','Sociable','Aggressive','Timid'], ans:1, explanation:'Gregarious=fond of company, sociable.' },
      { id:'ta10', section:'Numerical Ability', type:'mcq', marks:2, text:'Average of 5 consecutive even numbers is 16. Largest?', opts:['18','20','22','24'], ans:1, explanation:'Middle=16, Numbers:12,14,16,18,20. Largest=20' },
    ],
  },
  tcs_tech: {
    id: 'tcs_tech', title: 'TCS NQT – Technical Round', company: 'TCS',
    type: 'technical', duration: 60, totalMarks: 100,
    sections: ['Programming Concepts', 'OS', 'DBMS', 'Computer Networks'],
    questions: [
      { id:'tt1', section:'OS', type:'mcq', marks:3, text:'Which page replacement algorithm suffers from Belady\'s Anomaly?', opts:['LRU','Optimal','FIFO','LFU'], ans:2, explanation:'FIFO suffers Belady\'s Anomaly.' },
      { id:'tt2', section:'OS', type:'mcq', marks:3, text:'What is a semaphore used for?', opts:['Memory management','Process synchronization','File management','CPU scheduling'], ans:1, explanation:'Semaphores are synchronization primitives.' },
      { id:'tt3', section:'DBMS', type:'mcq', marks:3, text:'Which normal form removes transitive dependencies?', opts:['1NF','2NF','3NF','BCNF'], ans:2, explanation:'3NF removes transitive functional dependencies.' },
      { id:'tt4', section:'DBMS', type:'mcq', marks:3, text:'ACID stands for?', opts:['Atomicity,Consistency,Isolation,Durability','Atomicity,Concurrency,Integrity,Durability','Association,Consistency,Isolation,Dependency','Atomicity,Consistency,Integrity,Durability'], ans:0, explanation:'ACID = Atomicity, Consistency, Isolation, Durability.' },
      { id:'tt5', section:'Computer Networks', type:'mcq', marks:3, text:'Which OSI layer handles routing?', opts:['Data Link','Transport','Network','Session'], ans:2, explanation:'Network Layer (Layer 3) handles routing.' },
      { id:'tt6', section:'Programming Concepts', type:'mcq', marks:3, text:'Worst-case time complexity of Quick Sort?', opts:['O(n log n)','O(n^2)','O(n)','O(log n)'], ans:1, explanation:'When pivot is always min/max: O(n^2).' },
      { id:'tt7', section:'Programming Concepts', type:'mcq', marks:3, text:'What is a dangling pointer?', opts:['NULL pointer','Pointer to freed memory','Wild pointer','Void pointer'], ans:1, explanation:'Dangling pointer points to freed memory.' },
      { id:'tt8', section:'Programming Concepts', type:'mcq', marks:3, text:'Which data structure uses LIFO?', opts:['Queue','Stack','Array','Linked List'], ans:1, explanation:'Stack uses Last-In-First-Out.' },
      { id:'tt9', section:'OS', type:'mcq', marks:3, text:'Which scheduling algorithm can cause starvation?', opts:['FCFS','Round Robin','Priority Scheduling','SJF'], ans:2, explanation:'Priority Scheduling: low priority processes may never execute.' },
      { id:'tt10', section:'DBMS', type:'mcq', marks:3, text:'What does SELECT * FROM emp WHERE salary>(SELECT AVG(salary) FROM emp) return?', opts:['Below average employees','Above average employees','Average salary','All employees'], ans:1, explanation:'Returns employees with salary above average.' },
    ],
  },
  infy_tech: {
    id: 'infy_tech', title: 'Infosys – Specialist Programmer Test', company: 'Infosys',
    type: 'technical', duration: 60, totalMarks: 100,
    sections: ['Data Structures & Algorithms', 'DBMS', 'OS', 'System Design'],
    questions: [
      { id:'it1', section:'Data Structures & Algorithms', type:'mcq', marks:3, text:'Which traversal of BST gives sorted order?', opts:['Preorder','Inorder','Postorder','Level Order'], ans:1, explanation:'Inorder (Left->Root->Right) of BST gives ascending order.' },
      { id:'it2', section:'Data Structures & Algorithms', type:'mcq', marks:3, text:'Time complexity of insertion in Red-Black Tree?', opts:['O(1)','O(log n)','O(n)','O(n log n)'], ans:1, explanation:'Red-Black trees maintain O(log n) height.' },
      { id:'it3', section:'DBMS', type:'mcq', marks:3, text:'What is a phantom read?', opts:['Reading uncommitted data','Re-reading changed data','New rows appearing in repeated queries','Deleted data'], ans:2, explanation:'Phantom: transaction re-runs query and finds NEW rows.' },
      { id:'it4', section:'OS', type:'mcq', marks:3, text:'Difference between process and thread in terms of memory?', opts:['No difference','Threads share memory space, processes do not','Processes share memory','Threads are slower'], ans:1, explanation:'Threads share heap/globals within process.' },
      { id:'it5', section:'System Design', type:'mcq', marks:3, text:'CAP theorem stands for?', opts:['Consistency,Availability,Performance','Consistency,Availability,Partition tolerance','Concurrency,Atomicity,Performance','Concurrency,Availability,Persistence'], ans:1, explanation:'CAP: distributed system can guarantee 2 of 3.' },
      { id:'it6', section:'Data Structures & Algorithms', type:'mcq', marks:3, text:'Space complexity of merge sort?', opts:['O(1)','O(log n)','O(n)','O(n log n)'], ans:2, explanation:'Merge sort needs O(n) auxiliary space.' },
      { id:'it7', section:'System Design', type:'mcq', marks:3, text:'What is horizontal scaling?', opts:['Upgrading server hardware','Adding more servers to distribute load','Optimizing code','Adding RAM'], ans:1, explanation:'Horizontal scaling: add more nodes.' },
      { id:'it8', section:'DBMS', type:'mcq', marks:3, text:'Which JOIN returns all rows from both tables with NULLs for non-matching?', opts:['INNER JOIN','LEFT JOIN','RIGHT JOIN','FULL OUTER JOIN'], ans:3, explanation:'FULL OUTER JOIN returns all rows from both tables.' },
      { id:'it9', section:'OS', type:'mcq', marks:3, text:'Signal sent when Ctrl+C is pressed?', opts:['SIGTERM','SIGKILL','SIGINT','SIGHUP'], ans:2, explanation:'SIGINT (Signal Interrupt) sent on Ctrl+C.' },
      { id:'it10', section:'Data Structures & Algorithms', type:'mcq', marks:3, text:'Algorithm used in Huffman Encoding?', opts:['Dynamic Programming','Greedy','Backtracking','Divide and Conquer'], ans:1, explanation:'Huffman uses Greedy: always merge two smallest frequency nodes.' },
    ],
  },
  infy_apt: {
    id: 'infy_apt', title: 'Infosys – Quantitative & Reasoning', company: 'Infosys',
    type: 'aptitude', duration: 35, totalMarks: 60,
    sections: ['Mathematical Ability', 'Logical Reasoning'],
    questions: [
      { id:'ia1', section:'Mathematical Ability', type:'mcq', marks:3, text:'Train at 60 km/h takes 30s to cross 200m bridge. Length of train?', opts:['200m','300m','400m','100m'], ans:1, explanation:'60km/h=50/3 m/s. Distance=500m. Train=500-200=300m.' },
      { id:'ia2', section:'Mathematical Ability', type:'mcq', marks:3, text:'Ratio of ages A:B=4:5. Five years ago ratio was 3:4. Present age of A?', opts:['15','20','25','30'], ans:1, explanation:'4x-5/5x-5=3/4 -> x=5. A=20.' },
      { id:'ia3', section:'Logical Reasoning', type:'mcq', marks:3, text:'In row of 40 students, Ravi is 15th from right. Position from left?', opts:['24th','25th','26th','27th'], ans:2, explanation:'40-15+1=26.' },
      { id:'ia4', section:'Logical Reasoning', type:'mcq', marks:3, text:'Missing term: 3, 7, 15, 31, ?', opts:['47','63','55','71'], ans:1, explanation:'Each x2+1: 31x2+1=63.' },
      { id:'ia5', section:'Mathematical Ability', type:'mcq', marks:3, text:'20% of 20% of 600?', opts:['24','18','20','30'], ans:0, explanation:'20% of 600=120. 20% of 120=24.' },
      { id:'ia6', section:'Mathematical Ability', type:'mcq', marks:3, text:'Pipe A fills in 4 hrs, B empties in 6 hrs. Both open, time to fill?', opts:['10 hrs','12 hrs','8 hrs','6 hrs'], ans:1, explanation:'Net rate=1/4-1/6=1/12. Time=12 hours.' },
      { id:'ia7', section:'Logical Reasoning', type:'mcq', marks:3, text:'Odd one out: 17, 23, 31, 37, 43, 49', opts:['17','31','43','49'], ans:3, explanation:'49=7^2, not prime.' },
      { id:'ia8', section:'Mathematical Ability', type:'mcq', marks:3, text:'Number increased by 25% gives 75. Original?', opts:['55','60','62.5','65'], ans:1, explanation:'1.25x=75 -> x=60.' },
      { id:'ia9', section:'Mathematical Ability', type:'mcq', marks:3, text:'How many times does digit 9 appear in 1 to 100?', opts:['9','10','20','19'], ans:2, explanation:'Units: 9,19...99=10. Tens: 90-99=10. Total=20.' },
      { id:'ia10', section:'Logical Reasoning', type:'mcq', marks:3, text:'All birds fly. Ostrich is a bird. Ostrich flies?', opts:['True - logically follows','False - factually wrong','Cannot determine','Partially true'], ans:0, explanation:'In formal logic conclusion follows from premises.' },
    ],
  },
  amazon_oa: {
    id: 'amazon_oa', title: 'Amazon OA – SDE Intern/FTE', company: 'Amazon',
    type: 'technical', duration: 90, totalMarks: 120,
    sections: ['Data Structures', 'Algorithms', 'System Design Basics', 'OOP'],
    questions: [
      { id:'ao1', section:'Data Structures', type:'mcq', marks:3, text:'Time complexity of searching in a balanced BST?', opts:['O(1)','O(log n)','O(n)','O(n log n)'], ans:1, explanation:'Balanced BST maintains O(log n) height.' },
      { id:'ao2', section:'Algorithms', type:'mcq', marks:3, text:'Which algorithm finds shortest path with negative edges?', opts:['Dijkstra','Bellman-Ford','BFS','Floyd-Warshall'], ans:1, explanation:'Bellman-Ford handles negative edge weights.' },
      { id:'ao3', section:'OOP', type:'mcq', marks:3, text:'SOLID "Open/Closed Principle" means?', opts:['Classes should be small','Open for extension, closed for modification','Use interfaces over implementation','Single responsibility only'], ans:1, explanation:'OCP: open for extension but closed for modification.' },
      { id:'ao4', section:'System Design Basics', type:'mcq', marks:3, text:'What is eventual consistency?', opts:['Always consistent','Becomes consistent over time without immediate guarantee','Never consistent','Only during transactions'], ans:1, explanation:'Eventual consistency: becomes consistent if no new updates.' },
      { id:'ao5', section:'Algorithms', type:'mcq', marks:3, text:'Time complexity of building a heap from n elements?', opts:['O(n log n)','O(n)','O(log n)','O(n^2)'], ans:1, explanation:'Heapify bottom-up is O(n).' },
      { id:'ao6', section:'Data Structures', type:'mcq', marks:3, text:'What is a trie primarily used for?', opts:['Sorting numbers','String search and prefix matching','Graph traversal','Heap operations'], ans:1, explanation:'Tries: O(m) search/insert. Ideal for autocomplete.' },
      { id:'ao7', section:'Algorithms', type:'mcq', marks:3, text:'What is memoization?', opts:['A memory leak','Storing computed results to avoid recomputation','Loop optimization','Memory compression'], ans:1, explanation:'Memoization caches results — top-down DP.' },
      { id:'ao8', section:'System Design Basics', type:'mcq', marks:3, text:'What is a microservices architecture?', opts:['Single large application','Application split into small independent services','Server with multiple cores','Distributed database'], ans:1, explanation:'Microservices: application decomposed into small, independent services.' },
      { id:'ao9', section:'OOP', type:'mcq', marks:3, text:'Difference between abstract class and interface in Java (pre-Java 8)?', opts:['No difference','Abstract can have implementation, interface cannot','Interface can extend classes','Abstract can be instantiated'], ans:1, explanation:'Abstract: can have method bodies. Interface: only abstract methods.' },
      { id:'ao10', section:'Data Structures', type:'mcq', marks:3, text:'Which is NOT a self-balancing BST?', opts:['AVL Tree','Red-Black Tree','B-Tree','Binary Search Tree'], ans:3, explanation:'Regular BST is NOT self-balancing — can degrade to O(n).' },
    ],
  },
  google_tech: {
    id: 'google_tech', title: 'Google – STEP / SWE Intern OA', company: 'Google',
    type: 'technical', duration: 90, totalMarks: 100,
    sections: ['Algorithms', 'Data Structures', 'System Design', 'CS Fundamentals'],
    questions: [
      { id:'gt1', section:'CS Fundamentals', type:'mcq', marks:2, text:'Difference between TCP and UDP?', opts:['TCP is faster','TCP is connection-oriented, reliable; UDP is connectionless, faster','UDP is connection-oriented','No significant difference'], ans:1, explanation:'TCP: reliable, ordered. UDP: unreliable, fast.' },
      { id:'gt2', section:'Algorithms', type:'mcq', marks:2, text:'Time complexity of topological sort using DFS?', opts:['O(V)','O(E)','O(V+E)','O(V log E)'], ans:2, explanation:'Topological sort visits every vertex and edge once: O(V+E).' },
      { id:'gt3', section:'Data Structures', type:'mcq', marks:2, text:'Worst case HashMap get() in Java?', opts:['O(1)','O(log n)','O(n)','O(n log n)'], ans:2, explanation:'All keys same bucket -> linked list -> O(n).' },
      { id:'gt4', section:'CS Fundamentals', type:'mcq', marks:2, text:'What is virtual memory?', opts:['Extra RAM','Abstraction giving process illusion of dedicated memory using disk','GPU memory','Cloud storage'], ans:1, explanation:'Virtual memory: OS gives each process large address space, backed by RAM + swap.' },
      { id:'gt5', section:'Algorithms', type:'mcq', marks:2, text:'Key idea in Dynamic Programming?', opts:['Divide and conquer only','Greedy choices','Overlapping subproblems with optimal substructure','Randomized algorithms'], ans:2, explanation:'DP: solve each subproblem once, store results.' },
      { id:'gt6', section:'System Design', type:'mcq', marks:2, text:'What is a CDN?', opts:['A database','Globally distributed servers serving content from nearest location','A caching algorithm','A routing protocol'], ans:1, explanation:'CDN: distributed servers deliver content from geographically nearest server.' },
      { id:'gt7', section:'CS Fundamentals', type:'mcq', marks:2, text:'What is a context switch?', opts:['Changing screen resolution','Saving/restoring CPU state when switching between processes','Network change','File system operation'], ans:1, explanation:'Context switch: OS saves current registers/PC/stack and loads another process state.' },
      { id:'gt8', section:'Data Structures', type:'mcq', marks:2, text:'Advantage of skip lists over balanced BSTs?', opts:['Less memory','Simpler implementation with similar O(log n) performance','Faster sorting','Better cache'], ans:1, explanation:'Skip lists: probabilistically balanced, simpler than AVL/RB trees.' },
      { id:'gt9', section:'System Design', type:'mcq', marks:2, text:'What is a hash collision and how is it handled?', opts:['Hash function error','Two keys map to same index; resolved by chaining or open addressing','Memory overflow','Random output'], ans:1, explanation:'Collision: two keys hash to same slot. Chaining or open addressing.' },
      { id:'gt10', section:'Algorithms', type:'mcq', marks:2, text:'Time complexity of KMP string matching?', opts:['O(n*m)','O(n+m)','O(n log m)','O(m^2)'], ans:1, explanation:'KMP runs in O(n+m) using failure function preprocessing.' },
    ],
  },
  ms_tech: {
    id: 'ms_tech', title: 'Microsoft – SWE Campus OA', company: 'Microsoft',
    type: 'technical', duration: 75, totalMarks: 110,
    sections: ['Data Structures', 'Algorithms', 'OS & Networks', 'OOP & Design'],
    questions: [
      { id:'mt1', section:'Data Structures', type:'mcq', marks:3, text:'Amortized time complexity of dynamic array push?', opts:['O(n)','O(log n)','O(1) amortized','O(n^2)'], ans:2, explanation:'Occasional resize O(n) amortized over n operations = O(1).' },
      { id:'mt2', section:'Algorithms', type:'mcq', marks:3, text:'Floyd-Warshall algorithm finds?', opts:['Single-source shortest path','All-pairs shortest paths','MST','Topological order'], ans:1, explanation:'Floyd-Warshall: all-pairs shortest path. O(V^3).' },
      { id:'mt3', section:'OOP & Design', type:'mcq', marks:3, text:'What is the Decorator design pattern?', opts:['Creates copies of objects','Adds behavior to objects dynamically without modifying class','Defines object creation','Manages lifecycle'], ans:1, explanation:'Decorator: wraps object to add new behavior.' },
      { id:'mt4', section:'OS & Networks', type:'mcq', marks:3, text:'Difference between mutex and semaphore?', opts:['No difference','Mutex is binary, owned by thread; semaphore is counter, not owned','Semaphore is faster','Mutex allows multiple threads'], ans:1, explanation:'Mutex: binary lock owned by thread. Semaphore: integer counter.' },
      { id:'mt5', section:'OOP & Design', type:'mcq', marks:3, text:'Liskov Substitution Principle states?', opts:['Use lists not arrays','Derived classes substitutable for base without breaking program','Always use logger','Load balance services'], ans:1, explanation:'LSP: subtype objects can replace supertype objects without breaking correctness.' },
      { id:'mt6', section:'Data Structures', type:'mcq', marks:3, text:'In 0-indexed min-heap, children of node at index i are at?', opts:['2i and 2i+1','i+1 and i+2','2i+1 and 2i+2','i/2'], ans:2, explanation:'Left child=2i+1, right child=2i+2.' },
      { id:'mt7', section:'OS & Networks', type:'mcq', marks:3, text:'Purpose of ARP protocol?', opts:['Assign IPs','Resolve IP addresses to MAC addresses','Route packets','Encrypt traffic'], ans:1, explanation:'ARP: given IP address, find MAC address on local network.' },
      { id:'mt8', section:'Algorithms', type:'mcq', marks:3, text:'Master Theorem is used for?', opts:['Sorting arrays','Solving recurrence relations of divide-and-conquer algorithms','Dynamic programming','Graph algorithms'], ans:1, explanation:'Master theorem: solve T(n)=aT(n/b)+f(n) for D&C.' },
      { id:'mt9', section:'Data Structures', type:'mcq', marks:3, text:'Key property of B-tree for databases?', opts:['In-memory speed','High branching factor reduces tree height, minimizes disk I/O','Simple implementation','Sorted output'], ans:1, explanation:'B-tree: high branching = shallow = fewer disk reads.' },
      { id:'mt10', section:'OOP & Design', type:'mcq', marks:3, text:'What is dependency injection?', opts:['Importing libraries','Providing dependencies from outside rather than creating inside','A type of loop','Thread management'], ans:1, explanation:'DI: objects receive dependencies from external source.' },
    ],
  },
  cogni_apt: {
    id: 'cogni_apt', title: 'Cognizant GenC – Aptitude Test', company: 'Cognizant',
    type: 'aptitude', duration: 50, totalMarks: 80,
    sections: ['Quantitative', 'Logical', 'Verbal'],
    questions: [
      { id:'ca1', section:'Quantitative', type:'mcq', marks:4, text:'Sum doubles in 8 years at SI. Rate?', opts:['10%','12%','12.5%','15%'], ans:2, explanation:'P=SI -> PxRx8/100=P -> R=12.5%.' },
      { id:'ca2', section:'Quantitative', type:'mcq', marks:4, text:'Boat speed 15 km/h, river 5 km/h. Time for 100 km upstream?', opts:['5 hr','10 hr','15 hr','20 hr'], ans:1, explanation:'Upstream=10 km/h. Time=10 hr.' },
      { id:'ca3', section:'Logical', type:'mcq', marks:4, text:'All cats are dogs. All dogs are birds. All cats are birds?', opts:['True','False','Uncertain','Partially true'], ans:0, explanation:'By syllogism: cats->dogs->birds. TRUE.' },
      { id:'ca4', section:'Quantitative', type:'mcq', marks:4, text:'log(2)=0.3010. Find log(8)?', opts:['0.6020','0.9030','0.3010','1.2040'], ans:1, explanation:'log(8)=3xlog(2)=0.9030.' },
      { id:'ca5', section:'Verbal', type:'mcq', marks:4, text:'Synonym of GREGARIOUS?', opts:['Solitary','Sociable','Aggressive','Timid'], ans:1, explanation:'Gregarious=fond of company, sociable.' },
      { id:'ca6', section:'Quantitative', type:'mcq', marks:4, text:'In how many ways can 5 people sit in a circle?', opts:['120','24','60','5'], ans:1, explanation:'Circular arrangements=(n-1)!=4!=24.' },
      { id:'ca7', section:'Logical', type:'mcq', marks:4, text:'In group photo, A is 4th from left, 7th from right. Total people?', opts:['10','11','12','9'], ans:0, explanation:'Total=4+7-1=10.' },
      { id:'ca8', section:'Verbal', type:'mcq', marks:4, text:'Antonym of EPHEMERAL?', opts:['Temporary','Brief','Permanent','Fleeting'], ans:2, explanation:'Ephemeral=short-lived. Antonym=Permanent.' },
      { id:'ca9', section:'Quantitative', type:'mcq', marks:4, text:'Two numbers ratio 3:5, LCM is 75. HCF?', opts:['5','10','15','25'], ans:0, explanation:'Numbers=15,25. HCF=5.' },
      { id:'ca10', section:'Logical', type:'mcq', marks:4, text:'Odd one out: 17, 23, 31, 37, 43, 49', opts:['17','31','43','49'], ans:3, explanation:'49=7^2, not prime.' },
    ],
  },
  wipro_tech: {
    id: 'wipro_tech', title: 'Wipro WILP – Technical OA', company: 'Wipro',
    type: 'technical', duration: 60, totalMarks: 100,
    sections: ['Algorithms & DS', 'OOPS', 'DBMS', 'Computer Networks'],
    questions: [
      { id:'wt1', section:'Algorithms & DS', type:'mcq', marks:3, text:'Which sort is stable AND has O(n log n) worst case?', opts:['Quick Sort','Heap Sort','Merge Sort','Shell Sort'], ans:2, explanation:'Merge Sort: stable + O(n log n) always.' },
      { id:'wt2', section:'OOPS', type:'mcq', marks:3, text:'What is encapsulation?', opts:['Creating multiple objects','Bundling data and methods, hiding internal state','Inheriting from multiple classes','Overriding methods'], ans:1, explanation:'Encapsulation: wrapping fields+methods in class, private fields with public getters.' },
      { id:'wt3', section:'DBMS', type:'mcq', marks:3, text:'Difference between TRUNCATE and DELETE?', opts:['No difference','TRUNCATE: DDL, removes all rows, no rollback; DELETE: DML, supports WHERE, can rollback','DELETE is faster','TRUNCATE uses WHERE'], ans:1, explanation:'TRUNCATE: DDL, faster, no rollback. DELETE: DML, WHERE clause, can rollback.' },
      { id:'wt4', section:'Computer Networks', type:'mcq', marks:3, text:'TCP 3-way handshake sequence?', opts:['One packet','SYN -> SYN-ACK -> ACK','Data sent directly','ACK -> SYN -> FIN'], ans:1, explanation:'Client SYN -> Server SYN-ACK -> Client ACK.' },
      { id:'wt5', section:'OOPS', type:'mcq', marks:3, text:'Difference between == and .equals() in Java?', opts:['No difference','== compares references; .equals() compares content','equals() for primitives','== always works for Strings'], ans:1, explanation:'== checks memory address. .equals() checks logical equality.' },
      { id:'wt6', section:'DBMS', type:'mcq', marks:3, text:'What is denormalization?', opts:['Same as normalization','Adding redundancy to improve read performance','Removing all tables','Encryption'], ans:1, explanation:'Denormalization: add redundant data to avoid expensive joins.' },
      { id:'wt7', section:'Algorithms & DS', type:'mcq', marks:3, text:'Time complexity of DFS on graph with V vertices and E edges?', opts:['O(V)','O(E)','O(V+E)','O(VE)'], ans:2, explanation:'DFS visits each vertex and edge once = O(V+E).' },
      { id:'wt8', section:'OOPS', type:'mcq', marks:3, text:'What is method overriding?', opts:['Same name, different params in same class','Subclass provides specific implementation of superclass method','Making method private','Calling method multiple times'], ans:1, explanation:'Overriding: subclass redefines superclass method with same signature.' },
      { id:'wt9', section:'Computer Networks', type:'mcq', marks:3, text:'What is a subnet mask?', opts:['IP address type','Identifies network vs host portion of IP','Security filter','MAC address mask'], ans:1, explanation:'Subnet mask separates network and host bits.' },
      { id:'wt10', section:'DBMS', type:'mcq', marks:3, text:'What is a composite key?', opts:['A primary key only','Multiple columns that together uniquely identify a row','A foreign key','Auto-increment key'], ans:1, explanation:'Composite key: two+ columns forming unique key.' },
    ],
  },
};

const HARDCODED_CATALOG = Object.values(OA_BANK).map(t => ({
  id: t.id, title: t.title, company: t.company, type: t.type,
  duration: t.duration, totalMarks: t.totalMarks, sections: t.sections,
  questionCount: t.questions.length, source: 'platform', // ← platform tests
}));

const COMPANIES = [...new Set(HARDCODED_CATALOG.map(t => t.company))].sort();

// ── Colors ────────────────────────────────────────────────────────────────
const C = {
  bg: '#040c18', card: '#0b1a2e', cardB: '#0d1f3c',
  cyan: '#00c8f0', green: '#10c98a', amber: '#f5a623',
  red: '#f04b4b', violet: '#7c5cfc',
  gray: '#475569', light: '#94a3b8', white: '#e2e8f0',
};
const TYPE_COLOR = { aptitude: C.cyan, technical: C.violet, behavioural: C.amber };
const TYPE_ICON  = { aptitude: Brain, technical: Cpu, behavioural: BookOpen };

// ── Score calculator ───────────────────────────────────────────────────────
function calcScore(test, answers, questions) {
  let earned = 0, totalMCQ = 0, correct = 0, wrong = 0, skipped = 0;
  const breakdown = {};
  (questions || []).forEach(q => {
    const section = q.section;
    if (!breakdown[section]) breakdown[section] = { correct:0, wrong:0, total:0, marks:0, earned:0 };
    breakdown[section].total++;
    const correctIdx = q.correct_index !== undefined ? q.correct_index
                     : q.correct_answer !== undefined ? q.correct_answer
                     : q.ans;
    if (q.type === 'mcq') {
      totalMCQ++;
      const ans = answers[q.id];
      breakdown[section].marks += q.marks;
      if (ans === undefined || ans === null || ans === '') {
        skipped++;
      } else if (parseInt(ans) === correctIdx) {
        earned += q.marks; correct++;
        breakdown[section].correct++; breakdown[section].earned += q.marks;
      } else {
        const neg = Math.floor(q.marks / 4);
        earned = Math.max(0, earned - neg); wrong++;
        breakdown[section].wrong++;
      }
    } else if (q.type === 'text') {
      const resp = answers[q.id] || '';
      const wordCount = resp.trim().split(/\s+/).filter(Boolean).length;
      const pts = Math.round(q.marks * Math.min(wordCount / 100, 1) * 0.7);
      earned += pts; breakdown[section].earned += pts; breakdown[section].marks += q.marks;
    }
  });
  const totalMarks = test.total_marks || test.totalMarks || 100;
  const pct   = Math.min(100, Math.round((earned / totalMarks) * 100));
  const grade = pct>=90?'A+':pct>=80?'A':pct>=70?'B+':pct>=60?'B':pct>=50?'C':pct>=40?'D':'F';
  return { earned, total: totalMarks, pct, grade, correct, wrong, skipped, totalMCQ, breakdown, questions };
}

// ── Pill filter button ─────────────────────────────────────────────────────
const Pill = ({ label, active, color, onClick }) => (
  <button onClick={onClick} style={{ padding:'6px 16px', borderRadius:999, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif", background:active?`${color}18`:'rgba(255,255,255,0.04)', border:`1px solid ${active?color+'44':'rgba(255,255,255,0.08)'}`, color:active?color:'#64748b', transition:'all .2s' }}>
    {label}
  </button>
);

// ── Company Tag Badge ──────────────────────────────────────────────────────
const CompanyTag = () => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:999, fontSize:10, fontWeight:800, background:'linear-gradient(135deg,rgba(16,201,138,0.18),rgba(0,200,240,0.12))', color:C.green, border:'1px solid rgba(16,201,138,0.35)', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>
    <Building2 size={9}/> COMPANY PROVIDED
  </span>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function MockOA() {
  const { user } = useAuth();
  const [screen,      setScreen]      = useState('list');
  const [activeType,  setActiveType]  = useState('all');
  const [activeCo,    setActiveCo]    = useState('all');
  const [activeSource,setActiveSource]= useState('all'); // 'all' | 'company' | 'platform'
  const [search,      setSearch]      = useState('');
  const [test,        setTest]        = useState(null);
  const [questions,   setQuestions]   = useState([]);
  const [answers,     setAnswers]     = useState({});
  const [current,     setCurrent]     = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(0);
  const [result,      setResult]      = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [flagged,     setFlagged]     = useState(new Set());
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  // DB-fetched company-uploaded tests
  const [dbTests,     setDbTests]     = useState([]);
  const [dbLoading,   setDbLoading]   = useState(true);

  const timerRef = useRef(null);
  const startRef = useRef(null);

  // ── Fetch approved company-uploaded tests from API ─────────────────────
  useEffect(() => {
    api.get('/api/mockoa/tests')
      .then(r => {
        const tests = (r.data?.tests || []).map(t => ({
          id:            t.id,
          title:         t.title,
          company:       t.companies?.name || 'Company',
          companyLogo:   t.companies?.logo_url,
          type:          t.test_type,
          duration:      t.duration_minutes,
          totalMarks:    t.total_marks || 100,
          sections:      t.sections || [],
          questionCount: 0, // populated when test is opened
          source:        'company', // ← company-uploaded
          attempts:      t.attempts || 0,
          bestScore:     t.bestScore || null,
          dbId:          t.id,
        }));
        setDbTests(tests);
      })
      .catch(() => setDbTests([]))
      .finally(() => setDbLoading(false));
  }, []);

  // ── Merge catalogs: company tests first, then platform ─────────────────
  const allTests = [...dbTests, ...HARDCODED_CATALOG];
  const allCompanies = [...new Set(allTests.map(t => t.company))].sort();

  const filtered = allTests.filter(t => {
    if (activeType   !== 'all' && t.type    !== activeType)   return false;
    if (activeCo     !== 'all' && t.company !== activeCo)     return false;
    if (activeSource !== 'all' && t.source  !== activeSource) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
                  !t.company.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const companyTestCount = dbTests.length;

  // ── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'test') { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen]);

  // ── Tab proctoring ─────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'test') return;
    const onBlur = () => {
      setTabWarnings(w => {
        const next = w + 1;
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
        if (next >= 3) { toast.error('3 tab switches detected — auto-submitting!'); setTimeout(() => handleSubmit(true), 1500); }
        return next;
      });
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [screen]);

  // ── Start test ─────────────────────────────────────────────────────────
  const startTest = async (catalogEntry) => {
    if (catalogEntry.source === 'company') {
      // Fetch from API
      try {
        const r = await api.get(`/api/mockoa/tests/${catalogEntry.dbId}`);
        const t = r.data.test;
        const qs = (r.data.questions || []).map(q => ({
          id:            q.id,
          section:       q.section || 'General',
          type:          q.question_type || 'mcq',
          text:          q.question_text,
          opts:          q.options || [],
          ans:           q.correct_answer, // not sent by server during test, but set after submit
          correct_index: q.correct_answer,
          marks:         q.marks || 4,
        }));
        const testObj = {
          id:          t.id,
          title:       t.title,
          company:     t.companies?.name || catalogEntry.company,
          type:        t.test_type,
          duration:    t.duration_minutes,
          totalMarks:  t.total_marks || qs.reduce((s,q) => s + q.marks, 0),
          sections:    [...new Set(qs.map(q => q.section))],
          source:      'company',
        };
        setTest(testObj);
        setQuestions(qs);
      } catch (err) {
        toast.error('Failed to load test. Please try again.');
        return;
      }
    } else {
      // Load from hardcoded OA_BANK
      const full = OA_BANK[catalogEntry.id];
      if (!full) { toast.error('Test not found!'); return; }
      setTest(full);
      setQuestions(full.questions || []);
    }
    setAnswers({});
    setFlagged(new Set());
    setCurrent(0);
    setTimeLeft((catalogEntry.duration || 60) * 60);
    setTabWarnings(0);
    startRef.current = Date.now();
    setScreen('test');
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    clearInterval(timerRef.current);
    setSubmitting(true);

    if (test?.source === 'company') {
      // Submit to backend for accurate scoring
      try {
        const answerMap = {};
        Object.entries(answers).forEach(([qid, val]) => { answerMap[qid] = val; });
        const r = await api.post('/api/mockoa/submit', {
          testId: test.id,
          answers: answerMap,
          startedAt: new Date(startRef.current).toISOString(),
        });
        const d = r.data;
        // Build result shape compatible with result screen
        const breakdown = {};
        questions.forEach(q => {
          const sec = q.section || 'General';
          if (!breakdown[sec]) breakdown[sec] = { correct:0, wrong:0, total:0, marks:0, earned:0 };
          breakdown[sec].total++;
          breakdown[sec].marks += q.marks || 4;
          const scored = d.scoredAnswers?.[q.id];
          if (scored?.result === 'correct')   { breakdown[sec].correct++; breakdown[sec].earned += scored.points || 0; }
          if (scored?.result === 'wrong')     { breakdown[sec].wrong++; }
        });
        setResult({
          earned: d.score, total: d.totalPossible, pct: d.percentage,
          grade: d.percentage>=90?'A+':d.percentage>=80?'A':d.percentage>=70?'B+':d.percentage>=60?'B':d.percentage>=50?'C':d.percentage>=40?'D':'F',
          correct: d.correct, wrong: d.wrong, skipped: d.skipped,
          totalMCQ: (d.correct||0)+(d.wrong||0)+(d.skipped||0),
          timeTaken: Math.round((Date.now() - startRef.current) / 1000),
          autoSubmitted: auto, breakdown, questions,
          scoredAnswers: d.scoredAnswers,
        });
      } catch (err) {
        // Fallback to local scoring
        const res = calcScore(test, answers, questions);
        setResult({ ...res, timeTaken: Math.round((Date.now() - startRef.current) / 1000), autoSubmitted: auto });
      }
    } else {
      // Local scoring for platform tests
      const res = calcScore(test, answers, questions);
      try {
        const key = 'oa_attempts_' + test.id;
        const prev = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify([{ score: res.pct, time: new Date().toLocaleString(), grade: res.grade }, ...prev].slice(0, 5)));
      } catch (_) {}
      setResult({ ...res, timeTaken: Math.round((Date.now() - startRef.current) / 1000), autoSubmitted: auto });
    }

    setScreen('result');
    setSubmitting(false);
  }, [test, answers, submitting, questions]);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const tc  = timeLeft < 120 ? C.red : timeLeft < 300 ? C.amber : C.cyan;
  const q   = questions[current];

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN: LIST
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === 'list') return (
    <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:'#f0f6ff', fontFamily:"'Sora',sans-serif" }}>Mock OA Tests</h1>
        <p style={{ margin:'6px 0 0', fontSize:13, color:C.gray }}>
          Practice real company questions — platform tests + company-uploaded OAs
        </p>
      </div>

      {/* Company OA banner (only when there are company tests) */}
      {companyTestCount > 0 && (
        <div style={{ background:'linear-gradient(135deg,rgba(16,201,138,0.1),rgba(0,200,240,0.07))', border:'1px solid rgba(16,201,138,0.25)', borderRadius:14, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'rgba(16,201,138,0.15)', border:'1px solid rgba(16,201,138,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Building2 size={20} color={C.green}/>
          </div>
          <div>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:'#e2e8f0' }}>
              {companyTestCount} Company-Provided OA Test{companyTestCount !== 1 ? 's' : ''} Available!
            </p>
            <p style={{ margin:'3px 0 0', fontSize:12, color:'#64748b' }}>
              These tests are uploaded directly by recruiting companies and approved by your placement officer — practice exactly what you'll face in the real OA.
            </p>
          </div>
          <button onClick={() => setActiveSource('company')}
            style={{ marginLeft:'auto', padding:'8px 16px', background:C.green, color:'#040c18', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif", whiteSpace:'nowrap', flexShrink:0 }}>
            View These →
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#071525', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 14px', flex:'1', maxWidth:340 }}>
          <Search size={14} color={C.gray}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company or test name..."
            style={{ background:'none', border:'none', outline:'none', fontSize:13, color:C.white, flex:1, fontFamily:"'Sora',sans-serif" }}/>
          {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:C.gray }}><XCircle size={13}/></button>}
        </div>
      </div>

      {/* Source filter */}
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em', alignSelf:'center', marginRight:4 }}>Source:</span>
        <Pill label="All Tests" active={activeSource==='all'} color={C.white} onClick={()=>setActiveSource('all')}/>
        <Pill label={`🏢 Company Provided (${companyTestCount})`} active={activeSource==='company'} color={C.green} onClick={()=>setActiveSource('company')}/>
        <Pill label="📚 Platform Tests" active={activeSource==='platform'} color={C.violet} onClick={()=>setActiveSource('platform')}/>
      </div>

      {/* Type filter */}
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em', alignSelf:'center', marginRight:4 }}>Type:</span>
        {[['all','All',C.cyan],['aptitude','Aptitude',C.cyan],['technical','Technical',C.violet],['behavioural','Behavioural',C.amber]].map(([v,l,col])=>(
          <Pill key={v} label={l} active={activeType===v} color={col} onClick={()=>setActiveType(v)}/>
        ))}
      </div>

      {/* Company filter */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em', alignSelf:'center', marginRight:4 }}>Company:</span>
        <Pill label="All" active={activeCo==='all'} color={C.green} onClick={()=>setActiveCo('all')}/>
        {allCompanies.map(c => <Pill key={c} label={c} active={activeCo===c} color={C.green} onClick={()=>setActiveCo(c)}/>)}
      </div>

      <p style={{ fontSize:12, color:C.gray, marginBottom:14 }}>{filtered.length} test{filtered.length!==1?'s':''} found</p>

      {/* Loading skeleton */}
      {dbLoading && (
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ flex:1, height:60, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, animation:'pulse 1.5s infinite' }}/>
          ))}
        </div>
      )}

      {/* Test Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
        {filtered.map(t => {
          const color  = TYPE_COLOR[t.type] || C.violet;
          const Icon   = TYPE_ICON[t.type]  || Cpu;
          const isCompany = t.source === 'company';

          // Get attempt data
          const attData = (() => {
            if (isCompany) return t.bestScore != null ? [{ score: t.bestScore }] : [];
            try { return JSON.parse(localStorage.getItem('oa_attempts_' + t.id) || '[]'); } catch { return []; }
          })();
          const att = attData.length > 0 ? attData[0] : null;

          return (
            <div key={t.id}
              style={{ background:'linear-gradient(145deg,#0b1a2e,#0d1f3c)', border:`1px solid ${isCompany ? 'rgba(16,201,138,0.25)' : color+'20'}`, borderRadius:16, padding:22, display:'flex', flexDirection:'column', gap:14, transition:'border-color .2s, transform .2s', cursor:'default', position:'relative', overflow:'hidden' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=isCompany?'rgba(16,201,138,0.5)':color+'55'; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=isCompany?'rgba(16,201,138,0.25)':color+'20'; e.currentTarget.style.transform='translateY(0)'; }}>

              {/* Subtle glow for company tests */}
              {isCompany && (
                <div style={{ position:'absolute', top:0, right:0, width:120, height:120, background:'radial-gradient(circle at top right, rgba(16,201,138,0.08), transparent 70%)', pointerEvents:'none' }}/>
              )}

              {/* Card Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                    <Building2 size={12} color={C.gray}/>
                    <span style={{ fontSize:11, color:C.gray }}>{t.company}</span>
                    {/* ← COMPANY PROVIDED TAG */}
                    {isCompany && <CompanyTag />}
                  </div>
                  <p style={{ margin:0, fontSize:15, fontWeight:700, color:C.white, lineHeight:1.3 }}>{t.title}</p>
                </div>
                <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:`${color}18`, color, border:`1px solid ${color}33`, whiteSpace:'nowrap', marginLeft:8, textTransform:'capitalize' }}>
                  {t.type}
                </span>
              </div>

              {/* Meta */}
              <div style={{ display:'flex', gap:14, fontSize:12, color:C.light }}>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={11} color={C.gray}/>{t.duration}m</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><Icon size={11} color={C.gray}/>{t.questionCount || '?'} Qs</span>
                {isCompany && <span style={{ display:'flex', alignItems:'center', gap:4, color:C.green, fontSize:11, fontWeight:700 }}>✓ Verified</span>}
              </div>

              {/* Sections */}
              {t.sections?.length > 0 && (
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {t.sections.map(s => (
                    <span key={s} style={{ fontSize:10, padding:'2px 8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:5, color:C.light }}>{s}</span>
                  ))}
                </div>
              )}

              {/* Attempt info */}
              {att && (
                <p style={{ margin:0, fontSize:12, color:C.green, fontWeight:700 }}>✓ Attempted — Best: {att.score}%</p>
              )}

              {/* CTA */}
              <button onClick={() => startTest(t)}
                style={{ width:'100%', padding:'11px 0', background:att?`${color}15`:isCompany?`linear-gradient(135deg,${C.green},#00a878)`:color, border:`1px solid ${isCompany?C.green:color}`, borderRadius:10, fontSize:13, fontWeight:700, color:att?color:isCompany?'#040c18':'#040c18', cursor:'pointer', fontFamily:"'Sora',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .2s' }}>
                {att ? <><RefreshCw size={14}/> Retake Test</> : isCompany ? <><Building2 size={14}/> Start Company OA</> : <>Start Test →</>}
              </button>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && !dbLoading && (
        <p style={{ textAlign:'center', color:C.gray, padding:'60px 0', fontSize:14 }}>
          No tests match your filters.{activeSource==='company' && companyTestCount===0 ? ' No company OA tests have been approved yet.' : ''}
        </p>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN: TEST
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === 'test') {
    const sections = [...new Set(questions.map(q => q.section))];
    const answered = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length;
    const isCompanyTest = test?.source === 'company';

    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column' }}>

        {/* Top bar */}
        <div style={{ background:'#071525', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.white }}>{test.title}</p>
              {isCompanyTest && <CompanyTag />}
            </div>
            <p style={{ margin:0, fontSize:11, color:C.gray }}>{test.company} · {questions.length} Questions · {test.totalMarks} Marks</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ textAlign:'center' }}>
              <p style={{ margin:0, fontSize:11, color:C.gray }}>Answered</p>
              <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.green }}>{answered}/{questions.length}</p>
            </div>
            <div style={{ background:`${tc}18`, border:`1px solid ${tc}44`, borderRadius:10, padding:'8px 18px', display:'flex', alignItems:'center', gap:8 }}>
              <Clock size={16} color={tc}/>
              <span style={{ fontSize:20, fontWeight:800, color:tc, fontFamily:'monospace' }}>{fmt(timeLeft)}</span>
            </div>
            <button onClick={() => { if(window.confirm('Submit test now?')) handleSubmit(false); }} disabled={submitting}
              style={{ padding:'9px 18px', background:C.green, border:'none', borderRadius:9, fontSize:13, fontWeight:700, color:'#040c18', cursor:'pointer', fontFamily:"'Sora',sans-serif", display:'flex', alignItems:'center', gap:7 }}>
              <Send size={13}/>{submitting?'Submitting...':'Submit'}
            </button>
          </div>
        </div>

        {/* Tab warning */}
        {showWarning && (
          <div style={{ background:C.red+'22', border:`1px solid ${C.red}`, padding:'10px 24px', display:'flex', alignItems:'center', gap:10, fontSize:13, color:C.red, fontWeight:600 }}>
            <AlertTriangle size={16}/> Tab switch detected ({tabWarnings}/3). {3-tabWarnings} warning{3-tabWarnings!==1?'s':''} remaining before auto-submit.
          </div>
        )}

        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* Question palette */}
          <div style={{ width:220, background:'#071525', borderRight:'1px solid rgba(255,255,255,0.05)', padding:16, overflowY:'auto', flexShrink:0 }}>
            <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em' }}>Question Palette</p>
            {sections.map(sec => {
              const sqs = questions.filter(q => q.section === sec);
              return (
                <div key={sec} style={{ marginBottom:16 }}>
                  <p style={{ margin:'0 0 6px', fontSize:10, color:C.gray, fontWeight:600, letterSpacing:'0.05em' }}>{sec}</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {sqs.map(pq => {
                      const globalIdx = questions.findIndex(x => x.id === pq.id);
                      const isAns = answers[pq.id] !== undefined && answers[pq.id] !== '';
                      const isFl  = flagged.has(pq.id);
                      const isCur = globalIdx === current;
                      const bgc   = isCur ? C.cyan : isFl ? C.amber : isAns ? C.green : 'rgba(255,255,255,0.06)';
                      return (
                        <button key={pq.id} onClick={() => setCurrent(globalIdx)}
                          style={{ width:32, height:32, borderRadius:6, background:bgc, border:`1px solid ${isCur?C.cyan:isAns?C.green:isFl?C.amber:'rgba(255,255,255,0.08)'}`, color:isCur||isAns||isFl?'#040c18':C.light, fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {globalIdx+1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* Legend */}
            <div style={{ marginTop:16, borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:12 }}>
              {[{c:C.green,l:'Answered'},{c:C.amber,l:'Flagged'},{c:C.cyan,l:'Current'},{c:'rgba(255,255,255,0.06)',l:'Not visited'}].map(x=>(
                <div key={x.l} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                  <div style={{ width:12, height:12, borderRadius:3, background:x.c }}/>
                  <span style={{ fontSize:10, color:C.gray }}>{x.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Question area */}
          <div style={{ flex:1, overflowY:'auto', padding:32 }}>
            {q && (
              <div style={{ maxWidth:800, margin:'0 auto' }}>

                {/* Q header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <span style={{ background:'rgba(255,255,255,0.06)', borderRadius:8, padding:'4px 12px', fontSize:12, fontWeight:700, color:C.white }}>Q {current+1} of {questions.length}</span>
                    <span style={{ background:`${TYPE_COLOR[test.type]||C.violet}18`, borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:700, color:TYPE_COLOR[test.type]||C.violet, textTransform:'capitalize' }}>
                      {q.type === 'text' ? 'Descriptive' : 'MCQ'}
                    </span>
                    <span style={{ fontSize:11, color:C.gray }}>{q.section}</span>
                    <span style={{ fontSize:11, color:C.amber, fontWeight:700 }}>[{q.marks} marks]</span>
                    {isCompanyTest && <CompanyTag />}
                  </div>
                  <button onClick={() => setFlagged(f => { const n = new Set(f); n.has(q.id)?n.delete(q.id):n.add(q.id); return n; })}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:flagged.has(q.id)?`${C.amber}18`:'transparent', border:`1px solid ${flagged.has(q.id)?C.amber:'rgba(255,255,255,0.1)'}`, borderRadius:8, color:flagged.has(q.id)?C.amber:C.gray, fontSize:12, cursor:'pointer' }}>
                    <Flag size={12}/>{flagged.has(q.id)?'Flagged':'Flag'}
                  </button>
                </div>

                {/* Question text */}
                <div style={{ background:'#071525', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:24, marginBottom:20 }}>
                  <p style={{ margin:0, fontSize:15, color:C.white, lineHeight:1.7 }}>{q.text}</p>
                </div>

                {/* MCQ Options */}
                {q.type === 'mcq' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {(q.opts || q.options || []).map((opt, i) => {
                      const sel = parseInt(answers[q.id]) === i;
                      return (
                        <button key={i} onClick={() => setAnswers(a => ({...a, [q.id]: i}))}
                          style={{ textAlign:'left', padding:'14px 18px', background:sel?`${C.violet}18`:'rgba(255,255,255,0.03)', border:`1px solid ${sel?C.violet:'rgba(255,255,255,0.08)'}`, borderRadius:10, color:sel?C.white:C.light, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:12, fontFamily:"'Sora',sans-serif", transition:'all .15s' }}>
                          <span style={{ width:28, height:28, borderRadius:7, background:sel?C.violet:'rgba(255,255,255,0.06)', border:`1px solid ${sel?C.violet:'rgba(255,255,255,0.12)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:sel?'#fff':C.gray, flexShrink:0 }}>
                            {['A','B','C','D'][i]}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Text/Descriptive */}
                {q.type === 'text' && (
                  <div>
                    {q.wordLimit && <p style={{ fontSize:11, color:C.gray, marginBottom:8 }}>Recommended: {q.wordLimit} words | Written: {(answers[q.id]||'').trim().split(/\s+/).filter(Boolean).length} words</p>}
                    <textarea value={answers[q.id] || ''} onChange={e => setAnswers(a => ({...a, [q.id]: e.target.value}))}
                      placeholder={q.placeholder || 'Write your answer here...'} rows={10}
                      style={{ width:'100%', background:'#071525', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:16, fontSize:13, color:C.white, resize:'vertical', outline:'none', lineHeight:1.7, fontFamily:"'Sora',sans-serif", boxSizing:'border-box' }}/>
                  </div>
                )}

                {/* Navigation */}
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:24 }}>
                  <button onClick={() => setCurrent(c => Math.max(0,c-1))} disabled={current===0}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, color:current===0?C.gray:C.white, fontSize:13, cursor:current===0?'not-allowed':'pointer', fontFamily:"'Sora',sans-serif" }}>
                    <ChevronLeft size={15}/> Previous
                  </button>
                  <button onClick={() => setAnswers(a => ({...a,[q.id]:undefined}))}
                    style={{ padding:'10px 18px', background:'transparent', border:`1px solid ${C.red}33`, borderRadius:9, color:C.red, fontSize:12, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
                    Clear
                  </button>
                  <button onClick={() => setCurrent(c => Math.min(questions.length-1,c+1))} disabled={current===questions.length-1}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', background:C.cyan, border:'none', borderRadius:9, color:'#040c18', fontSize:13, fontWeight:700, cursor:current===questions.length-1?'not-allowed':'pointer', fontFamily:"'Sora',sans-serif" }}>
                    Next <ChevronRight size={15}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN: RESULT
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === 'result' && result) {
    const gradeColor = result.grade.startsWith('A')?C.green:result.grade==='B+'||result.grade==='B'?C.cyan:result.grade==='C'?C.amber:C.red;
    const timeTakenFmt = `${Math.floor(result.timeTaken/60)}m ${result.timeTaken%60}s`;
    const isCompanyTest = test?.source === 'company';

    const radarData = Object.entries(result.breakdown).map(([sec, b]) => ({
      subject: sec.length > 12 ? sec.substring(0,12)+'…' : sec,
      score: b.marks > 0 ? Math.round((b.earned/b.marks)*100) : 0,
      fullMark: 100,
    }));

    const barData = Object.entries(result.breakdown).map(([sec, b]) => ({
      name: sec.length > 10 ? sec.substring(0,10)+'…' : sec,
      earned: b.earned, total: b.marks,
    }));

    const CustomTooltip = ({active,payload,label}) => active&&payload?.length
      ? <div style={{background:'#0b1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 12px'}}>
          <p style={{margin:0,fontSize:11,color:C.gray}}>{label}</p>
          {payload.map((p,i)=><p key={i} style={{margin:'3px 0 0',fontSize:13,fontWeight:700,color:p.color||C.cyan}}>{p.name}: {p.value}</p>)}
        </div> : null;

    return (
      <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:'#f0f6ff', fontFamily:"'Sora',sans-serif" }}>OA Analysis Dashboard</h1>
              {isCompanyTest && <CompanyTag />}
            </div>
            <p style={{ margin:0, fontSize:13, color:C.gray }}>{test.title} · {test.company}</p>
            {result.autoSubmitted && <span style={{ fontSize:11, color:C.amber, fontWeight:700 }}>⚡ Auto-submitted (timer expired)</span>}
          </div>
          <button onClick={() => setScreen('list')}
            style={{ padding:'9px 18px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, color:C.white, fontSize:13, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
            ← Back to Tests
          </button>
        </div>

        {/* Score cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            { label:'Score',           value:`${result.earned}/${result.total}`, sub:`${result.pct}%`,             color:gradeColor },
            { label:'Grade',           value:result.grade,                       sub:'Performance',                 color:gradeColor },
            { label:'Correct / Wrong', value:`${result.correct} / ${result.wrong}`, sub:`${result.skipped} skipped`, color:C.green },
            { label:'Time Taken',      value:timeTakenFmt,                       sub:`of ${test.duration}m allowed`, color:C.cyan },
          ].map((m,i) => (
            <div key={i} style={{ background:'linear-gradient(145deg,#0b1a2e,#0d1f3c)', border:`1px solid ${m.color}22`, borderRadius:14, padding:20, textAlign:'center' }}>
              <p style={{ margin:0, fontSize:12, color:C.gray, textTransform:'uppercase', letterSpacing:'0.06em' }}>{m.label}</p>
              <p style={{ margin:'8px 0 2px', fontSize:26, fontWeight:800, color:m.color, fontFamily:"'Sora',sans-serif", lineHeight:1 }}>{m.value}</p>
              <p style={{ margin:0, fontSize:11, color:C.gray }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
          <div style={{ background:'linear-gradient(145deg,#0b1a2e,#0d1f3c)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:20 }}>
            <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>Marks by Section</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{top:4,right:4,bottom:0,left:-20}}>
                <XAxis dataKey="name" tick={{fill:C.gray,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.gray,fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="earned" name="Earned" radius={[4,4,0,0]} maxBarSize={28}>
                  {barData.map((entry,i) => {
                    const pct = entry.total>0?Math.round((entry.earned/entry.total)*100):0;
                    return <Cell key={i} fill={pct>=75?C.green:pct>=50?C.amber:C.red}/>;
                  })}
                </Bar>
                <Bar dataKey="total" name="Total" fill="rgba(255,255,255,0.06)" radius={[4,4,0,0]} maxBarSize={28}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {radarData.length >= 3 ? (
            <div style={{ background:'linear-gradient(145deg,#0b1a2e,#0d1f3c)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:20 }}>
              <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>Section Radar</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)"/>
                  <PolarAngleAxis dataKey="subject" tick={{fill:C.gray,fontSize:10}}/>
                  <Radar name="Score %" dataKey="score" stroke={gradeColor} fill={gradeColor} fillOpacity={0.2} strokeWidth={2}/>
                  <Tooltip content={<CustomTooltip/>}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ background:'linear-gradient(145deg,#0b1a2e,#0d1f3c)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:20 }}>
              <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>MCQ Breakdown</p>
              <div style={{ display:'flex', gap:12, marginBottom:14 }}>
                {[{l:'Correct',v:result.correct,c:C.green},{l:'Wrong',v:result.wrong,c:C.red},{l:'Skipped',v:result.skipped,c:C.gray}].map(x=>(
                  <div key={x.l} style={{ flex:1, textAlign:'center', padding:14, background:`${x.c}0f`, border:`1px solid ${x.c}22`, borderRadius:10 }}>
                    <p style={{ margin:0, fontSize:24, fontWeight:800, color:x.c }}>{x.v}</p>
                    <p style={{ margin:'4px 0 0', fontSize:11, color:C.gray }}>{x.l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section table */}
        <div style={{ background:'linear-gradient(145deg,#0b1a2e,#0d1f3c)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:20, marginBottom:20 }}>
          <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>Section-wise Performance</p>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Section','Questions','Correct','Marks Earned','Total','Score %'].map(h=>(
              <th key={h} style={{ padding:'8px 12px', fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid rgba(255,255,255,0.05)', textAlign:'left' }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {Object.entries(result.breakdown).map(([sec, b]) => {
                const pct = b.marks>0?Math.round((b.earned/b.marks)*100):0;
                const col = pct>=75?C.green:pct>=50?C.amber:C.red;
                return (
                  <tr key={sec}>
                    <td style={{ padding:'12px', fontSize:13, color:C.white, borderBottom:'1px solid rgba(255,255,255,0.03)', fontWeight:600 }}>{sec}</td>
                    <td style={{ padding:'12px', fontSize:13, color:C.light, borderBottom:'1px solid rgba(255,255,255,0.03)' }}>{b.total}</td>
                    <td style={{ padding:'12px', fontSize:13, color:C.green, borderBottom:'1px solid rgba(255,255,255,0.03)', fontWeight:700 }}>{b.correct}</td>
                    <td style={{ padding:'12px', fontSize:13, color:col, borderBottom:'1px solid rgba(255,255,255,0.03)', fontWeight:700 }}>{b.earned}</td>
                    <td style={{ padding:'12px', fontSize:13, color:C.light, borderBottom:'1px solid rgba(255,255,255,0.03)' }}>{b.marks}</td>
                    <td style={{ padding:'12px', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.05)', borderRadius:999 }}>
                          <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:999, transition:'width .6s' }}/>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:col, minWidth:36 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Q-by-Q review (platform tests only — company tests don't expose correct_answer during test) */}
        {!isCompanyTest && (
          <div style={{ background:'linear-gradient(145deg,#0b1a2e,#0d1f3c)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:20, marginBottom:24 }}>
            <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>Question-by-Question Review</p>
            {result.questions.filter(q=>q.type==='mcq').map((q,i) => {
              const userAns = answers[q.id];
              const correctIdx = q.correct_index !== undefined ? q.correct_index : q.correct_answer !== undefined ? q.correct_answer : q.ans;
              const isCorrect = parseInt(userAns) === correctIdx;
              const isSkipped = userAns === undefined || userAns === null || userAns === '';
              const statusColor = isSkipped?C.gray:isCorrect?C.green:C.red;
              const statusIcon  = isSkipped?'—':isCorrect?'✓':'✗';
              return (
                <div key={q.id} style={{ marginBottom:12, padding:16, background:`${statusColor}08`, border:`1px solid ${statusColor}20`, borderRadius:10 }}>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <span style={{ width:26, height:26, borderRadius:7, background:statusColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#040c18', flexShrink:0 }}>{statusIcon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <p style={{ margin:0, fontSize:13, color:C.white, lineHeight:1.5, flex:1 }}><strong>Q{i+1}.</strong> {q.text}</p>
                        <span style={{ fontSize:11, color:C.gray, whiteSpace:'nowrap', marginLeft:12 }}>{q.section}</span>
                      </div>
                      <div style={{ display:'flex', gap:16, fontSize:12, flexWrap:'wrap', marginBottom:q.explanation?8:0 }}>
                        <span style={{ color:C.gray }}>Your answer: <strong style={{ color:isSkipped?C.gray:isCorrect?C.green:C.red }}>{isSkipped?'Not attempted':(q.opts||q.options||[])[parseInt(userAns)]||'N/A'}</strong></span>
                        <span style={{ color:C.gray }}>Correct: <strong style={{ color:C.green }}>{(q.opts||q.options||[])[correctIdx]}</strong></span>
                      </div>
                      {q.explanation && <p style={{ margin:0, fontSize:12, color:C.light, background:'rgba(255,255,255,0.03)', borderRadius:6, padding:'8px 10px' }}>💡 {q.explanation}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Company test note */}
        {isCompanyTest && (
          <div style={{ background:'rgba(16,201,138,0.06)', border:'1px solid rgba(16,201,138,0.2)', borderRadius:12, padding:16, marginBottom:24 }}>
            <p style={{ margin:0, fontSize:13, color:'#94a3b8' }}>
              <span style={{ color:C.green, fontWeight:700 }}>📋 Company Test Note: </span>
              Detailed question-by-question review is not shown for company-uploaded tests to maintain integrity. Your score has been recorded.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <button onClick={() => startTest(test.source === 'company' ? { ...test, dbId: test.id } : (HARDCODED_CATALOG.find(t=>t.id===test.id)||test))}
            style={{ padding:'12px 28px', background:C.violet, border:'none', borderRadius:10, fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:"'Sora',sans-serif", display:'flex', alignItems:'center', gap:8 }}>
            <RefreshCw size={15}/> Retake Test
          </button>
          <button onClick={() => setScreen('list')}
            style={{ padding:'12px 28px', background:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, fontSize:14, fontWeight:700, color:C.white, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
            All Tests
          </button>
        </div>
      </div>
    );
  }

  return null;
}
