import { observer } from 'mobx-react-lite'
import logo from './assets/logo.svg'

const Footer = observer(() => {
    return (
        <div className='text-brown mx-auto mt-auto flex w-full max-w-screen-lg flex-row items-center justify-center gap-4 p-8 pb-16'>
            <img src={logo} className='-ml-4 -mr-3 h-12' />
            <p className='text-sm'>Powered by Hipo</p>
        </div>
    )
})

export default Footer
