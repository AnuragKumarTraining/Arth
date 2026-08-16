// import './App.css'
import { useRoutes } from 'react-router-dom'
import Register from './pages/createAccount'
import Homepage from './pages/homepage'
import Login from './pages/login'


function App() {
  function CustomRoutes(){
  const element = useRoutes([
    {
      path : "/register",
      element : <Register/>
    },
    {
      path:"/",
      element : <Homepage/>
    },
    {
      path:"/login",
      element : <Login/>
    }
  ])
  return element
}
return(
<>
  <CustomRoutes/>
</>
)
}

export default App

