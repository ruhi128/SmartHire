// src/pages/admin/Students.jsx
import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import { Search, Download, Filter, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AMBER='#f5a623', GREEN='#10c98a', CYAN='#00c8f0', RED='#f04b4b';
const STATUS_COLOR = { placed:GREEN, unplaced:AMBER, opted_out:'#64748b' };

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState({ branch:'', status:'' });
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    adminAPI.getStudents()
      .then(r => setStudents(r.data?.students || DEMO_STUDENTS))
      .catch(() => setStudents(DEMO_STUDENTS))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await adminAPI.updatePlacement(id, status);
      setStudents(prev => prev.map(s => s.id===id ? {...s, placement_status:status} : s));
      toast.success('Status updated');
    } catch { toast.error('Update failed'); }
    finally { setUpdating(null); }
  };

  const downloadCSV = () => {
    const rows = [['Name','Roll','Branch','CGPA','Email','Placement'],...filtered.map(s=>[s.full_name,s.roll_number,s.branch,s.cgpa,s.email,s.placement_status])];
    const csv  = rows.map(r=>r.join(',')).join('\n');
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = 'students.csv'; a.click();
  };

  const filtered = students.filter(s => {
    if (filter.branch && s.branch !== filter.branch) return false;
    if (filter.status && s.placement_status !== filter.status) return false;
    if (search && !s.full_name?.toLowerCase().includes(search.toLowerCase()) && !s.roll_number?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const branches = [...new Set(students.map(s=>s.branch).filter(Boolean))];

  return (
    <div style={s.page}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div><h1 style={s.h1}>Students</h1><p style={s.sub}>{filtered.length} of {students.length} students</p></div>
        <button style={s.dlBtn} onClick={downloadCSV}><Download size={14}/>Export CSV</button>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,background:'#071525',border:'1px solid rgba(255,255,255,0.08)',borderRadius:9,padding:'8px 12px',flex:1,maxWidth:300}}>
          <Search size={13} color="#475569"/>
          <input style={{background:'none',border:'none',outline:'none',fontSize:13,color:'#e2e8f0',flex:1,fontFamily:"'Sora',sans-serif"}} placeholder="Search name or roll number..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select style={s.sel} value={filter.branch} onChange={e=>setFilter(f=>({...f,branch:e.target.value}))}>
          <option value="">All Branches</option>
          {branches.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        <select style={s.sel} value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
          <option value="">All Status</option>
          <option value="placed">Placed</option>
          <option value="unplaced">Unplaced</option>
          <option value="opted_out">Opted Out</option>
        </select>
      </div>

      <GlowCard accent={AMBER} noPadding>
        {loading
          ? <div style={{padding:40,textAlign:'center'}}><Loader2 size={24} color={AMBER} style={{animation:'spin 1s linear infinite'}}/></div>
          : <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['Student','Roll No','Branch','CGPA','Backlogs','Placement Status','Action'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(st=>(
                  <tr key={st.id}>
                    <td style={s.td}>
                      <p style={{margin:0,fontSize:13,fontWeight:600,color:'#e2e8f0'}}>{st.full_name}</p>
                      <p style={{margin:'2px 0 0',fontSize:11,color:'#475569'}}>{st.email}</p>
                    </td>
                    <td style={s.td}>{st.roll_number||'—'}</td>
                    <td style={s.td}>{st.branch||'—'}</td>
                    <td style={s.td}><span style={{color:parseFloat(st.cgpa)>=7.5?GREEN:parseFloat(st.cgpa)>=6?AMBER:RED,fontWeight:700}}>{st.cgpa||'—'}</span></td>
                    <td style={s.td}><span style={{color:st.backlogs>0?RED:'#64748b',fontWeight:st.backlogs>0?700:400}}>{st.backlogs??0}</span></td>
                    <td style={s.td}><span style={{padding:'2px 10px',borderRadius:999,fontSize:11,fontWeight:700,background:`${STATUS_COLOR[st.placement_status]||AMBER}18`,color:STATUS_COLOR[st.placement_status]||AMBER,border:`1px solid ${STATUS_COLOR[st.placement_status]||AMBER}33`,textTransform:'capitalize'}}>{(st.placement_status||'unplaced').replace('_',' ')}</span></td>
                    <td style={s.td}>
                      {updating===st.id
                        ? <Loader2 size={14} color={AMBER} style={{animation:'spin 1s linear infinite'}}/>
                        : <select style={{...s.sel,padding:'4px 8px',fontSize:11}} value={st.placement_status||'unplaced'} onChange={e=>updateStatus(st.id,e.target.value)}>
                            <option value="unplaced">Unplaced</option>
                            <option value="placed">Placed</option>
                            <option value="opted_out">Opted Out</option>
                          </select>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </GlowCard>
    </div>
  );
}

const s = {
  page:  { padding:24, maxWidth:1200, margin:'0 auto' },
  h1:    { margin:0, fontSize:24, fontWeight:800, color:'#f0f6ff', fontFamily:"'Sora',sans-serif" },
  sub:   { margin:'6px 0 0', fontSize:13, color:'#475569' },
  dlBtn: { display:'flex', alignItems:'center', gap:7, padding:'9px 16px', background:`${AMBER}14`, border:`1px solid ${AMBER}33`, borderRadius:9, color:AMBER, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif" },
  sel:   { background:'#071525', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, padding:'8px 10px', fontSize:12, color:'#e2e8f0', outline:'none', fontFamily:"'Sora',sans-serif", cursor:'pointer' },
  th:    { padding:'10px 14px', fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid rgba(255,255,255,0.05)', textAlign:'left' },
  td:    { padding:'12px 14px', fontSize:13, color:'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.03)' },
};

const DEMO_STUDENTS = [
  {id:'s1',full_name:'Aarav Kumar',   roll_number:'21CS001',branch:'CSE', cgpa:'8.5',backlogs:0,email:'aarav@demo.com',  placement_status:'placed'},
  {id:'s2',full_name:'Priya Sharma',  roll_number:'21CS042',branch:'IT',  cgpa:'7.8',backlogs:0,email:'priya@demo.com',  placement_status:'placed'},
  {id:'s3',full_name:'Rahul Verma',   roll_number:'21CS018',branch:'CSE', cgpa:'9.1',backlogs:0,email:'rahul@demo.com',  placement_status:'placed'},
  {id:'s4',full_name:'Ankit Singh',   roll_number:'21IT005',branch:'IT',  cgpa:'6.2',backlogs:2,email:'ankit@demo.com',  placement_status:'unplaced'},
  {id:'s5',full_name:'Sneha Patel',   roll_number:'21ECE12',branch:'ECE', cgpa:'7.4',backlogs:1,email:'sneha@demo.com',  placement_status:'unplaced'},
  {id:'s6',full_name:'Kiran Reddy',   roll_number:'21CS029',branch:'CSE', cgpa:'8.9',backlogs:0,email:'kiran@demo.com',  placement_status:'placed'},
  {id:'s7',full_name:'Meena Iyer',    roll_number:'21IT018',branch:'IT',  cgpa:'7.1',backlogs:0,email:'meena@demo.com',  placement_status:'unplaced'},
  {id:'s8',full_name:'Arjun Nair',    roll_number:'21CS055',branch:'CSE', cgpa:'6.8',backlogs:1,email:'arjun@demo.com',  placement_status:'opted_out'},
];
