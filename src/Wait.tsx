import { observer } from 'mobx-react-lite'
import { Model } from './Model'
import logo from './assets/logo.svg'
import loading from './assets/loading.svg'
import warning from './assets/warning.svg'

interface Props {
    model: Model
}

const Wait = observer(({ model }: Props) => {
    let img
    let heading
    let message
    let button
    if (model.waitForTransaction === 'wait') {
        img = (
            <div>
                <img src={loading} className='m-4 mx-auto h-16 animate-spin' />
            </div>
        )
        heading = <h1 className='text-center text-xl font-bold'>Finalizing your transaction</h1>
        message = <p className='mt-4 text-center'>Awaiting the processing of your transaction in the next block.</p>
    } else if (model.waitForTransaction === 'timeout') {
        img = (
            <div>
                <img src={warning} className='m-4 mx-auto h-16' />
            </div>
        )
        heading = <h1 className='text-center text-xl font-bold'>Cannot find your transaction</h1>
        message = <p className='mt-4 text-center'>Despite multiple attempts, we could not locate it.</p>
        button = (
            <button
                className='bg-orange mt-4 h-14 w-full rounded-2xl text-lg font-medium text-white'
                onClick={() => {
                    model.setWaitForTransaction('no')
                }}
            >
                Okay
            </button>
        )
    } else if (model.waitForTransaction === 'done') {
        img = (
            <div>
                <img src={logo} className='m-4 mx-auto h-32' />
            </div>
        )
        heading = (
            <h1 className='text-center text-xl font-bold'>
                Successfully {model.isStakeTabActive ? 'staked' : 'unstaked'}
            </h1>
        )
        button = (
            <button
                className='bg-orange mt-4 h-14 w-full rounded-2xl text-lg font-medium text-white'
                onClick={() => {
                    model.setWaitForTransaction('no')
                }}
                onKeyDown={(e) => {
                    if (e.key == 'Escape') {
                        const button = e.target as HTMLButtonElement
                        button.click()
                    }
                }}
                autoFocus
            >
                Okay
            </button>
        )
    }

    if (model.waitForTransaction !== 'no') {
        return (
            <div
                className={
                    'text-brown fixed left-0 top-0 z-[1000] flex h-full w-full overflow-y-auto bg-black bg-opacity-40 p-8'
                }
            >
                <div className='bg-milky m-auto w-96 max-w-sm rounded-3xl p-8 shadow-2xl'>
                    {img}
                    {heading}
                    {message}
                    {button}
                </div>
            </div>
        )
    }
})

export default Wait
