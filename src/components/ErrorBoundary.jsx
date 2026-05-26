import React from "react"

export default class ErrorBoundary extends React.Component {

constructor(props){
  super(props)
  this.state = { hasError:false }
}

static getDerivedStateFromError(){
  return { hasError:true }
}

componentDidCatch(error,info){
  console.error("Component crash:", error, info)
}

render(){

if(this.state.hasError){
  return (
    <div style={{
      padding:20,
      background:"#1a1a1a",
      borderRadius:8,
      marginTop:20
    }}>
      Component failed to load
    </div>
  )
}

return this.props.children

}

}
