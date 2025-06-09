import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import NavBar from './components/elements/NavBar';
import DesktopPanel from './components/elements/DesktopPanel';
import About from './components/modules/About';
import Resume from './components/modules/Resume';
import Experiences from './components/modules/Experiences';
import Projects from './components/modules/Projects';
import Crypto from './components/modules/Crypto';
import { img } from './assets/images/img';

const routes = [
  {
    name: 'About',
    path: '/about',
    icon: img.about
  },
  {
    name: 'Resume',
    path: '/resume',
    icon: img.resume
  },
  {
    name: 'Experiences',
    path: '/experiences',
    icon: img.experiences
  },
  {
    name: 'Projects',
    path: '/projects',
    icon: img.projects
  },
  {
    name: 'Crypto',
    path: '/crypto',
    icon: img.crypto
  }
];

function App() {
  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    setInitialLoad(false);
  }, []);

  return (
    <>
      <DesktopPanel routes={routes} />
      <NavBar routes={routes} />

      <Routes>
        <Route path="/" element={initialLoad ? <Navigate to="/about" replace/> : null} />
        <Route path="/about" element={<About/>} />
        <Route path="/resume" element={<Resume/>} />
        <Route path="/experiences" element={<Experiences/>} />
        <Route path="/projects" element={<Projects/>} />
        <Route path="/crypto" element={<Crypto/>} />
      </Routes>
    </>
  );
}

export default App;