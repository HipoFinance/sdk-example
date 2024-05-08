import { observer } from 'mobx-react-lite'
import { Model } from './Model'
import loading from './assets/loading.svg'

interface Props {
    model: Model
}

const LoadingIndicator = observer(({ model }: Props) => {
    return (
        <div
            className={
                'bg-dark pointer-events-none fixed bottom-20 right-5 z-50 w-10 rounded-full bg-opacity-20 sm:bottom-2' +
                (model.ongoingRequests > 0 ? '' : ' hidden')
            }
        >
            <img src={loading} className='h-10 animate-spin' />
        </div>
    )
})

export default LoadingIndicator
