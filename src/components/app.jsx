import * as React from 'react';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.handleNavClick = this.handleNavClick.bind(this);
        this.state = {
            navItem: "Home",
            Home: 'block',
            Search: 'none',
            Playlists: 'none',
            Settings: 'none',
        }
        this.navItems = ['Home', 'Search', 'Playlists', 'Settings']
    }

    handleNavClick(navItem) {
        if (navItem == this.state.navItem) { return }
        let widget;
        this.navItems.forEach(n => {
            this.setState({
                [n]: navItem === n ? 'block' : 'none'
            })
        })

        this.setState({ navItem: navItem })
    }

    render() {
        return (
            <div>

                <div>
                    <NavigationBar navItems={['Home', 'Search', 'Playlists', 'Settings']} handleOnClick={this.handleNavClick} />
                </div>
                <div className="main">
                    <div className="Home" style={{ display:this.state.Home}}>
                        <HomeForm />
                    </div>
                    <div className="Search" style={{ display:this.state.Search}}>
                        <SearchForm />
                    </div>
                    <div className="Playlists" style={{ display:this.state.Playlists}}>
                        <PlaylistForm />
                    </div>
                    <div className="Settings" style={{ display:this.state.Settings}}>
                        <SettingsForm />
                    </div>
                </div>
            </div>
        )
    }
}