import { observer } from 'mobx-react-lite'
import { Model } from './Model'
import error from './assets/error.svg'

interface Props {
    model: Model
}

const ErrorDisplay = observer(({ model }: Props) => {
    return (
        <div
            className={
                'bg-orange fixed bottom-20 left-6 flex max-w-screen-sm rounded-2xl p-2 text-white drop-shadow sm:bottom-2' +
                (model.errorMessage === '' ? ' hidden' : '')
            }
        >
            <img src={error} className='h-6' />
            <p className='mx-1'>{model.errorMessage}</p>
        </div>
    )
})

export default ErrorDisplay
