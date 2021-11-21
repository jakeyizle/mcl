import * as React from 'react';


class App extends React.Component {
    constructor(props) {
        super(props);
        this.handleNavClick = this.handleNavClick.bind(this);
        this.state = {displayedWidget: undefined}
    }

    handleNavClick(navItem) {
        let widget;
        switch(navItem) {
            case "Search":
                widget = <SearchForm />
                break;
            case "Playlists":
                widget = <PlaylistForm />
                break;
            case "Settings":
                widget = <SettingsForm />
                break;
            default:
                widget = <div>UH OH!</div>
                break;
        }
        this.setState({displayedWidget: widget})
    }

    render() {
        return (
            <div>
                <div>
                    <NavigationBar navItems={['Search', 'Playlists', 'Settings']} handleOnClick={this.handleNavClick} />
                </div>
                <div className="main">
                    {this.state.displayedWidget}
                </div>
            </div>
        )
    }
}