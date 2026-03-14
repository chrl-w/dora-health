import { Header } from './components/Header'
import { Medications } from './components/Medications'
import { Journal } from './components/Journal'
import { HealthMetrics } from './components/HealthMetrics'

function App() {
  return (
    <div className="mx-auto max-w-[402px] min-h-[874px] bg-[#FDFAF7] sm:rounded-[40px] pt-[60px] px-[20px] pb-[40px]">
      <Header />
      <Medications />
      <Journal />
      <HealthMetrics />
    </div>
  )
}

export default App
