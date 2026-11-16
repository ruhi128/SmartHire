// src/data/demoJobs.js
// Realistic demo jobs for campus placement recording (Deloitte, EXL, Infosys, TCS, Capgemini)

const getFutureDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const DEMO_JOBS = [
  {
    id: 'j_deloitte',
    title: 'Associate Solution Advisor (Software & Cloud)',
    description: 'Deloitte USI is hiring engineering graduates for Technology Consulting & Solutions. You will design, develop, and deploy enterprise cloud applications, microservices, and automated analytics solutions for global clients across BFSI and Healthcare sectors.',
    min_cgpa: 6.5,
    eligible_branches: ['CST', 'IT', 'ENC', 'AI'],
    required_skills: ['Java', 'Python', 'Cloud (AWS/Azure)', 'SQL', 'Problem Solving', 'REST APIs'],
    package_lpa: 7.6,
    job_type: 'full-time',
    deadline: getFutureDate(15),
    drive_date: getFutureDate(22),
    max_backlogs: 0,
    status: 'active',
    rounds: 'Online Aptitude & Coding Test → Technical Interview 1 → Partner / HR Round',
    companies: {
      id: 'c_deloitte',
      name: 'Deloitte',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Deloitte.svg'
    }
  },
  {
    id: 'j_exl',
    title: 'Associate Consultant – Analytics & AI',
    description: 'EXL Service is hiring for its Analytics COE. Work alongside data science leads to engineer predictive machine learning models, ETL data pipelines, and interactive executive intelligence dashboards for Fortune 500 enterprises.',
    min_cgpa: 6.8,
    eligible_branches: ['CST', 'IT', 'AI', 'ENC'],
    required_skills: ['Python', 'SQL', 'Machine Learning', 'Data Analysis', 'Tableau', 'Statistics'],
    package_lpa: 6.8,
    job_type: 'full-time',
    deadline: getFutureDate(18),
    drive_date: getFutureDate(25),
    max_backlogs: 0,
    status: 'active',
    rounds: 'Online Assessment (Quant + Python) → Tech Interview → Behavioral Round',
    companies: {
      id: 'c_exl',
      name: 'EXL',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/EXL_Service_logo.svg'
    }
  },
  {
    id: 'j_infosys',
    title: 'Specialist Programmer (Digital Specialist)',
    description: 'Infosys is hiring fresh graduates for high-impact software engineering roles. Build distributed cloud platforms, scalable backend APIs, and microservices architecture across next-gen enterprise technology stacks.',
    min_cgpa: 6.5,
    eligible_branches: ['CST', 'IT', 'ENC', 'AI'],
    required_skills: ['C++', 'Java', 'Python', 'Data Structures', 'DBMS', 'Algorithms'],
    package_lpa: 9.5,
    job_type: 'full-time',
    deadline: getFutureDate(12),
    drive_date: getFutureDate(19),
    max_backlogs: 0,
    status: 'active',
    rounds: 'InfyTQ / HackWithInfy Coding OA → Technical Interview → HR Interview',
    companies: {
      id: 'c_infosys',
      name: 'Infosys',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Infosys_logo.svg'
    }
  },
  {
    id: 'j_tcs',
    title: 'Software Engineer (TCS Digital)',
    description: 'Tata Consultancy Services is hiring through campus recruitment for the Digital Cadre. Work on cutting-edge engineering products spanning cloud infrastructure, AI integrations, and full-stack enterprise web platforms.',
    min_cgpa: 6.0,
    eligible_branches: ['CST', 'IT', 'ENC', 'AI'],
    required_skills: ['Java', 'SQL', 'Algorithms', 'Web Development', 'OOP'],
    package_lpa: 7.2,
    job_type: 'full-time',
    deadline: getFutureDate(10),
    drive_date: getFutureDate(17),
    max_backlogs: 1,
    status: 'active',
    rounds: 'TCS NQT (Aptitude + Advanced Coding) → Technical & Managerial Interview → HR Round',
    companies: {
      id: 'c_tcs',
      name: 'TCS',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Tata_Consultancy_Services_Logo.svg'
    }
  },
  {
    id: 'j_capgemini',
    title: 'Senior Analyst & Full Stack Developer',
    description: 'Capgemini Technology Services is seeking dynamic engineering graduates. Collaborate in agile squads to design and develop modern React frontends, robust Node.js microservices, and automated testing suites.',
    min_cgpa: 6.5,
    eligible_branches: ['CST', 'IT', 'ENC', 'AI'],
    required_skills: ['JavaScript', 'React.js', 'Node.js', 'PostgreSQL', 'Git', 'REST APIs'],
    package_lpa: 7.5,
    job_type: 'full-time',
    deadline: getFutureDate(21),
    drive_date: getFutureDate(28),
    max_backlogs: 0,
    status: 'active',
    rounds: 'Online Cognitive & Pseudocode Test → Coding Test → Technical Interview → HR Interview',
    companies: {
      id: 'c_capgemini',
      name: 'Capgemini',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Capgemini_201x_logo.svg'
    }
  }
];
