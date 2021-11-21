import * as React from 'react';
import ReactDOM from 'react-dom';

class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}


ReactDOM.render(
  <App></App>,
  document.getElementById('react')
);


console.log(1);