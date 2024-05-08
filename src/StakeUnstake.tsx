import { observer } from 'mobx-react-lite'
import { Model } from './Model'
import ton from './assets/ton.svg'
import hton from './assets/hton.svg'

interface Props {
    model: Model
}

const StakeUnstake = observer(({ model }: Props) => {
    return (
        <div className='font-body text-brown mx-auto w-full max-w-screen-lg'>
            <p className='pt-4 text-center text-3xl font-bold'>Hipo SDK Usage Example</p>

            <div className='bg-milky mx-auto my-8 w-max rounded-full p-0.5'>
                <ul
                    className={
                        'tab-bar relative flex select-none flex-nowrap' +
                        (model.isStakeTabActive ? ' stake' : ' unstake')
                    }
                >
                    <li
                        className='z-[1] m-1 inline-block w-36 cursor-pointer rounded-full py-1 text-center'
                        onClick={() => {
                            model.setActiveTab('stake')
                        }}
                    >
                        Stake
                    </li>
                    <li
                        className='z-[1] m-1 inline-block w-36 cursor-pointer rounded-full py-1 text-center'
                        onClick={() => {
                            model.setActiveTab('unstake')
                        }}
                    >
                        Unstake
                    </li>
                </ul>
            </div>

            <div
                className={
                    'h-8 transition-all duration-700 motion-reduce:transition-none' +
                    (model.isWalletConnected ? ' max-h-0' : ' max-h-8')
                }
            ></div>

            <div className='mx-auto mb-12 max-w-lg'>
                <div
                    className={
                        'overflow-hidden transition-all duration-700 motion-reduce:transition-none' +
                        (model.isWalletConnected ? ' max-h-[20rem]' : ' max-h-0')
                    }
                >
                    <div className='bg-brown mx-4 rounded-t-2xl px-8 pb-12 pt-4 text-sm text-white'>
                        <div className='flex flex-row flex-wrap'>
                            <p className='font-light'>TON balance</p>
                            <p className='ml-auto font-medium'>{model.tonBalanceFormatted}</p>
                        </div>

                        {model.stakingInProgressDetails.map((value) => (
                            <div key={value.estimated + value.amount} className='flex flex-row flex-wrap'>
                                <p className='font-light opacity-70'>
                                    {value.estimated == null
                                        ? 'In progress'
                                        : 'In progress, done by ' + value.estimated}
                                </p>
                                <p className='ml-auto font-medium opacity-70'>{value.amount}</p>
                            </div>
                        ))}

                        <div className='my-4 h-px bg-white opacity-40'></div>

                        <div className='flex flex-row flex-wrap'>
                            <p className='font-light'>hTON balance</p>
                            <p className='ml-auto font-medium'>{model.htonBalanceFormatted}</p>
                        </div>

                        <div
                            className={
                                'flex flex-row flex-wrap' + (model.unstakingInProgressDetails != null ? '' : ' hidden')
                            }
                        >
                            <p className='font-light opacity-70'>
                                {model.unstakingInProgressDetails?.estimated == null
                                    ? 'In progress'
                                    : 'In progress, done by ' + model.unstakingInProgressDetails.estimated}
                            </p>
                            <p className='ml-auto font-medium opacity-70'>{model.unstakingInProgressFormatted}</p>
                        </div>
                    </div>
                </div>

                <div className='mx-4 -mt-8 rounded-2xl bg-white p-8 shadow-sm'>
                    <p>{model.isStakeTabActive ? 'Stake' : 'Unstake'}</p>

                    <label>
                        <div
                            className={
                                'border-milky focus-within:border-brown mb-8 mt-4 flex flex-row rounded-lg border p-4 ' +
                                (model.isAmountValid ? '' : ' border-orange focus-within:border-orange')
                            }
                        >
                            <img src={ton} className={'w-7' + (model.isStakeTabActive ? '' : ' hidden')} />
                            <img src={hton} className={'w-7' + (model.isStakeTabActive ? ' hidden' : '')} />
                            <input
                                type='text'
                                inputMode='decimal'
                                placeholder=' Amount'
                                size={1}
                                className={
                                    'h-full w-full flex-1 px-3 text-lg focus:outline-none' +
                                    (model.isAmountValid ? '' : ' text-orange')
                                }
                                value={model.amount}
                                onInput={(e) => {
                                    const target = e.target as HTMLInputElement
                                    model.setAmount(target.value)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && model.isButtonEnabled) {
                                        const button = document.querySelector<HTMLInputElement>('#submit')
                                        if (button != null) {
                                            button.click()
                                            const target = e.target as HTMLInputElement
                                            target.blur()
                                        }
                                    }
                                }}
                            />
                            <button
                                className={
                                    'bg-milky rounded-lg px-3 text-xs focus:outline-none' +
                                    (model.isAmountValid ? '' : ' bg-orange hover:!bg-brown text-white')
                                }
                                onClick={model.setAmountToMax}
                            >
                                Max
                            </button>
                        </div>
                    </label>

                    <button
                        id='submit'
                        className='bg-orange h-14 w-full rounded-2xl text-lg font-medium text-white disabled:opacity-80'
                        disabled={!model.isButtonEnabled}
                        onClick={(e) => {
                            if (model.isWalletConnected) {
                                model.send()
                            } else {
                                model.connect()
                            }
                            const target = e.target as HTMLInputElement
                            target.blur()
                        }}
                    >
                        {model.buttonLabel}
                    </button>

                    <div className='mt-12 text-sm font-medium'>
                        <div className='my-4 flex flex-row flex-wrap'>
                            <p>You will receive</p>
                            <p className='ml-auto'>{model.youWillReceive}</p>
                        </div>
                        <div className='my-4 flex flex-row flex-wrap'>
                            <p>Exchange rate</p>
                            <p className='ml-auto'>{model.exchangeRateFormatted}</p>
                        </div>
                        <div className='my-4 flex flex-row flex-wrap'>
                            <p>APY</p>
                            <p className='ml-auto'>{model.apyFormatted}</p>
                        </div>
                        <div className='my-4 flex flex-row flex-wrap'>
                            <p>Currently staked</p>
                            <p className='ml-auto'>{model.currentlyStaked}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})

export default StakeUnstake
