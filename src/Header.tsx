import { observer } from 'mobx-react-lite'
import logo from './assets/logo.svg'

const Header = observer(() => {
    return (
        <div className='font-body text-brown mx-auto w-full max-w-screen-lg'>
            <div className='mx-4 flex flex-row items-center pt-4'>
                <img src={logo} className='-ml-4 -mr-3 h-20' />
                <p className='font-logo text-orange ml-3 text-2xl'>Hipo</p>

                <div id='ton-connect-button' className='ml-auto min-w-max'></div>
            </div>
        </div>
    )
})

export default Header
