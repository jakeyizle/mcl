import * as React from 'react';

class NavigationBar extends React.Component {
    constructor(props) {
        super(props);

        this.onNavClick = this.onNavClick.bind(this);
        
    };
    
    onNavClick(e) { 
        this.props.handleOnClick(e.target.getAttribute('name'));
    }

    render() {
        let navItems = this.props.navItems.map(x => <div key={x} name={x} className="navitem" onClick={this.onNavClick}>{x}</div>)
        return (<div className="sidenav">{navItems}</div>)
    }
}