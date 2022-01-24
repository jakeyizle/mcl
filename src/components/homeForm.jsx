
class HomeForm extends React.Component {
    constructor(props) {
        super(props)
    }

    isReplayPathValid() {
        const replayPath = db.prepare("SELECT value from settings where key = 'replayPath'").pluck().get();
        return replayPath;
    }
    render() {
        return (
            this.isReplayPathValid()
                ? <DatabaseProgressBar />
                : <div>Please set a valid replay path.</div>
        )
    }
}