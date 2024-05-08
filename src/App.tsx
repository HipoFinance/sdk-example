import { observer } from 'mobx-react-lite'
import { Model } from './Model'
import Header from './Header'
import StakeUnstake from './StakeUnstake'
import Wait from './Wait'
import Footer from './Footer'
import LoadingIndicator from './LoadingIndicator'
import ErrorDisplay from './ErrorDisplay'
import '@fontsource/poppins/300.css'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/700.css'
import '@fontsource/eczar/800.css'

interface Props {
    model: Model
}

const App = observer(({ model }: Props) => {
    return (
        <>
            <Header />
            <StakeUnstake model={model} />
            <Wait model={model} />
            <Footer />
            <LoadingIndicator model={model} />
            <ErrorDisplay model={model} />
        </>
    )
})

export default App
