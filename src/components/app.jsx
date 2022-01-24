import * as React from 'react';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.handleNavClick = this.handleNavClick.bind(this);
        this.state = { displayedWidget: <HomeForm /> }
    }

    handleNavClick(navItem) {
        let widget;
        switch (navItem) {
            case "Search":
                widget = <SearchForm />
                break;
            case "Playlists":
                widget = <PlaylistForm />
                break;
            case "Settings":
                widget = <SettingsForm />
                break;
            case "Home":
            default:
                widget = <HomeForm />
                break;
        }
        this.setState({ displayedWidget: widget })
    }

    render() {
        return (
            <div>

                <div>
                    <NavigationBar navItems={['Home', 'Search', 'Playlists', 'Settings']} handleOnClick={this.handleNavClick} />
                </div>
                <div className="main">
                    {this.state.displayedWidget}
                </div>
            </div>
        )
    }
}