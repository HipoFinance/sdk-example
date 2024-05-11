import {
    maxAmountToStake,
    treasuryAddresses,
    Times,
    Treasury,
    TreasuryConfig,
    Parent,
    Wallet,
    WalletState,
    ParticipationState,
    createDepositMessage,
    createUnstakeMessage,
} from '@hipo-finance/sdk'
import { getHttpV4Endpoint, Network } from '@orbs-network/ton-access'
import { Address, Dictionary, fromNano, OpenedContract, toNano, TonClient4 } from '@ton/ton'
import { CHAIN, SendTransactionRequest, TonConnectUI } from '@tonconnect/ui'
import { action, autorun, computed, makeObservable, observable, runInAction } from 'mobx'

type ActiveTab = 'stake' | 'unstake'

type WaitForTransaction = 'no' | 'wait' | 'timeout' | 'done'

// Set your referrer wallet address here to receive referral rewards.
const referrerAddress = '<REFERRER_WALLET_ADDRESS>'

const updateLastBlockDelay = 30 * 1000
const retryDelay = 6 * 1000
const checkBalanceChangeDelay = 6 * 1000
const txValidUntil = 5 * 60

const defaultNetwork: Network = 'mainnet'
const defaultActiveTab: ActiveTab = 'stake'

const tonConnectButtonRootId = 'ton-connect-button'

const errorMessageTonAccess = 'Unable to access blockchain'
const errorMessageNetworkMismatch = 'Your wallet must be on '

export class Model {
    // observed state
    network: Network = defaultNetwork
    tonClient?: TonClient4
    address?: Address
    tonBalance?: bigint
    treasury?: OpenedContract<Treasury>
    treasuryState?: TreasuryConfig
    times?: Times
    walletAddress?: Address
    wallet?: OpenedContract<Wallet>
    walletState?: WalletState
    activeTab: ActiveTab = defaultActiveTab
    amount = ''
    waitForTransaction: WaitForTransaction = 'no'
    ongoingRequests = 0
    errorMessage = ''

    // unobserved state
    tonConnectUI?: TonConnectUI
    lastBlock = 0
    timeoutConnectTonAccess?: ReturnType<typeof setTimeout>
    timeoutReadTimes?: ReturnType<typeof setTimeout>
    timeoutReadLastBlock?: ReturnType<typeof setTimeout>
    timeoutErrorMessage?: ReturnType<typeof setTimeout>

    constructor() {
        makeObservable(this, {
            network: observable,
            tonClient: observable,
            address: observable,
            tonBalance: observable,
            treasury: observable,
            treasuryState: observable,
            times: observable,
            walletAddress: observable,
            wallet: observable,
            walletState: observable,
            activeTab: observable,
            amount: observable,
            waitForTransaction: observable,
            ongoingRequests: observable,
            errorMessage: observable,

            isWalletConnected: computed,
            isMainnet: computed,
            isStakeTabActive: computed,
            tonBalanceFormatted: computed,
            htonBalanceFormatted: computed,
            unstakingInProgressFormatted: computed,
            unstakingInProgressDetails: computed,
            stakingInProgressFormatted: computed,
            stakingInProgressDetails: computed,
            maxAmount: computed,
            amountInNano: computed,
            isAmountValid: computed,
            isAmountPositive: computed,
            isButtonEnabled: computed,
            buttonLabel: computed,
            youWillReceive: computed,
            exchangeRate: computed,
            exchangeRateFormatted: computed,
            apy: computed,
            apyFormatted: computed,
            currentlyStaked: computed,

            setTonClient: action,
            setAddress: action,
            setTimes: action,
            setActiveTab: action,
            setAmount: action,
            setAmountToMax: action,
            setWaitForTransaction: action,
            beginRequest: action,
            endRequest: action,
            setErrorMessage: action,
        })
    }

    init() {
        this.initTonConnect()

        autorun(() => {
            this.connectTonAccess()
        })

        autorun(() => {
            this.readTimes()
        })

        autorun(() => {
            void this.readLastBlock()
        })
    }

    get isWalletConnected() {
        return this.address != null
    }

    get isMainnet() {
        return this.network === 'mainnet'
    }

    get isStakeTabActive() {
        return this.activeTab === 'stake'
    }

    get tonBalanceFormatted() {
        if (this.tonBalance != null) {
            return formatNano(this.tonBalance) + ' TON'
        }
    }

    get htonBalanceFormatted() {
        if (this.tonBalance != null) {
            return formatNano(this.walletState?.tokens ?? 0n) + ' hTON'
        }
    }

    get unstakingInProgressFormatted() {
        return formatNano(this.walletState?.unstaking ?? 0n) + ' hTON'
    }

    get unstakingInProgressDetails() {
        const value = this.walletState?.unstaking
        if (value == null || value === 0n || this.treasuryState == null) {
            return
        }
        let time = undefined
        const firstParticipationKey = this.treasuryState.participations.keys()[0] ?? 0n
        const firstParticipationValue = this.treasuryState.participations.get(firstParticipationKey)
        if ((firstParticipationValue?.state ?? ParticipationState.Open) >= ParticipationState.Staked) {
            time = firstParticipationValue?.stakeHeldUntil
        }
        return {
            amount: formatNano(value) + ' hTON',
            estimated: time == null ? undefined : formatDate(new Date((Number(time) + 5 * 60) * 1000)),
        }
    }

    get stakingInProgressFormatted() {
        let result = 0n
        const empty = Dictionary.empty(Dictionary.Keys.BigUint(32), Dictionary.Values.BigVarUint(4))
        const staking = this.walletState?.staking ?? empty
        const times = staking.keys()
        for (const time of times) {
            const value = staking.get(time)
            if (value != null) {
                result += value
            }
        }
        return formatNano(result) + ' TON'
    }

    get stakingInProgressDetails() {
        const result = []
        const empty = Dictionary.empty(Dictionary.Keys.BigUint(32), Dictionary.Values.BigVarUint(4))
        const staking = this.walletState?.staking ?? empty
        const times = staking.keys()
        for (const time of times) {
            const value = staking.get(time)
            if (value != null) {
                const until = this.treasuryState?.participations.get(time)?.stakeHeldUntil ?? 0n
                result.push({
                    amount: formatNano(value) + ' TON',
                    estimated: until === 0n ? undefined : formatDate(new Date((Number(until) + 5 * 60) * 1000)),
                })
            }
        }
        return result
    }

    get maxAmount() {
        const isStakeTabActive = this.isStakeTabActive
        const tonBalance = this.tonBalance
        const walletState = this.walletState
        if (isStakeTabActive) {
            // reserve enough TON for user's ton wallet storage fee + enough funds for future unstake
            return maxAmountToStake(tonBalance ?? 0n)
        } else {
            return walletState?.tokens ?? 0n
        }
    }

    get amountInNano() {
        const amount = this.amount.trim()
        try {
            return toNano(amount)
        } catch {
            return undefined
        }
    }

    get isAmountValid() {
        const nano = this.amountInNano
        return nano != null && nano >= 0n && (this.tonBalance == null || nano <= this.maxAmount)
    }

    get isAmountPositive() {
        const nano = this.amountInNano
        return nano != null && nano > 0n
    }

    get isButtonEnabled() {
        const isAmountValid = this.isAmountValid
        const isAmountPositive = this.isAmountPositive
        const tonBalance = this.tonBalance
        const htonBalance = this.walletState?.tokens
        const haveBalance = this.isStakeTabActive ? tonBalance != null : htonBalance != null
        if (this.isWalletConnected) {
            return isAmountValid && isAmountPositive && haveBalance
        } else {
            return true
        }
    }

    get buttonLabel() {
        if (this.isWalletConnected) {
            return this.isStakeTabActive ? 'Stake' : 'Unstake'
        } else {
            return 'Connect Wallet'
        }
    }

    get youWillReceive() {
        const rate = this.exchangeRate
        const nano = this.amountInNano
        const isStakeTabActive = this.isStakeTabActive
        if (rate == null) {
            return
        } else if (nano == null || !this.isAmountValid || !this.isAmountPositive) {
            return isStakeTabActive ? 'hTON' : 'TON'
        } else {
            return `~ ${formatNano(Number(nano) * rate)} ${isStakeTabActive ? 'hTON' : 'TON'}`
        }
    }

    get exchangeRate() {
        const state = this.treasuryState
        if (state != null) {
            if (this.isStakeTabActive) {
                return Number(state.totalTokens) / Number(state.totalCoins) || 1
            } else {
                return Number(state.totalCoins) / Number(state.totalTokens) || 1
            }
        }
    }

    get exchangeRateFormatted() {
        const state = this.treasuryState
        if (state != null) {
            const rate = Number(state.totalCoins) / Number(state.totalTokens) || 1
            return '1 hTON = ~ ' + rate.toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' TON'
        }
    }

    get apy() {
        const times = this.times
        const lastStaked = this.treasuryState?.lastStaked
        const lastRecovered = this.treasuryState?.lastRecovered
        if (times != null && lastStaked != null && lastRecovered != null) {
            const duration = 2 * Number(times.nextRoundSince - times.currentRoundSince)
            const year = 365 * 24 * 60 * 60
            const compoundingFrequency = year / duration
            return Math.pow(Number(lastRecovered) / Number(lastStaked) || 1, compoundingFrequency) - 1
        }
    }

    get apyFormatted() {
        if (this.apy != null) {
            return formatPercent(this.apy)
        }
    }

    get currentlyStaked() {
        if (this.treasuryState != null) {
            return (
                (Number(this.treasuryState.totalCoins) / 1000000000).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                }) + ' TON'
            )
        }
    }

    setTonClient = (endpoint: string) => {
        this.tonClient = new TonClient4({ endpoint })
    }

    setAddress = (address?: Address) => {
        this.address = address
        this.tonBalance = undefined
        this.walletAddress = undefined
        this.wallet = undefined
        this.walletState = undefined
        this.lastBlock = 0
    }

    setTimes = (times?: Times) => {
        this.times = times
    }

    setActiveTab = (activeTab: ActiveTab) => {
        if (this.activeTab !== activeTab) {
            this.activeTab = activeTab
            this.amount = ''
        }
    }

    setAmount = (amount: string) => {
        this.amount = amount
    }

    setAmountToMax = () => {
        this.amount = fromNano(this.maxAmount)
    }

    setWaitForTransaction = (wait: WaitForTransaction) => {
        this.waitForTransaction = wait
    }

    beginRequest = () => {
        this.ongoingRequests += 1
    }

    endRequest = () => {
        this.ongoingRequests -= 1
    }

    setErrorMessage = (errorMessage: string, delay: number) => {
        this.errorMessage = errorMessage
        clearTimeout(this.timeoutErrorMessage)
        if (errorMessage !== '') {
            this.timeoutErrorMessage = setTimeout(() => {
                this.setErrorMessage('', 0)
            }, delay)
        }
    }

    connectTonAccess = () => {
        const network = this.network
        clearTimeout(this.timeoutConnectTonAccess)
        getHttpV4Endpoint({ network })
            .then(this.setTonClient)
            .catch(() => {
                this.timeoutConnectTonAccess = setTimeout(this.connectTonAccess, retryDelay)
            })
    }

    readTimes = () => {
        const tonClient = this.tonClient
        const treasuryAddress = treasuryAddresses.get(this.network)
        clearTimeout(this.timeoutReadTimes)

        if (tonClient == null || treasuryAddress == null) {
            this.setTimes(undefined)
            return
        }

        tonClient
            .open(Treasury.createFromAddress(treasuryAddress))
            .getTimes()
            .then(this.setTimes)
            .catch(() => {
                clearTimeout(this.timeoutReadTimes)
                this.timeoutReadTimes = setTimeout(this.readTimes, retryDelay)
            })
    }

    readLastBlock = async () => {
        const tonClient = this.tonClient
        const address = this.address
        const treasuryAddress = treasuryAddresses.get(this.network)
        clearTimeout(this.timeoutReadLastBlock)
        this.timeoutReadLastBlock = setTimeout(() => void this.readLastBlock(), updateLastBlockDelay)

        if (tonClient == null || treasuryAddress == null) {
            runInAction(() => {
                this.tonBalance = undefined
                this.treasury = undefined
                this.treasuryState = undefined
                this.walletAddress = undefined
                this.wallet = undefined
                this.walletState = undefined
            })
            return
        }

        try {
            this.beginRequest()
            const lastBlock = (await tonClient.getLastBlock()).last.seqno
            if (lastBlock < this.lastBlock) {
                throw new Error('older block')
            }
            const treasury = tonClient.openAt(lastBlock, Treasury.createFromAddress(treasuryAddress))

            const readTreasuryState = treasury.getTreasuryState()

            const readTonBalance =
                address == null
                    ? Promise.resolve(undefined)
                    : tonClient.getAccountLite(lastBlock, address).then((value) => BigInt(value.account.balance.coins))

            const readWallet: Promise<[Address, OpenedContract<Wallet>, typeof this.walletState] | undefined> =
                address == null || this.treasuryState?.parent == null
                    ? Promise.resolve(undefined)
                    : (this.walletAddress != null
                          ? Promise.resolve(this.walletAddress)
                          : tonClient
                                .openAt(lastBlock, Parent.createFromAddress(this.treasuryState.parent))
                                .getWalletAddress(address)
                      ).then(async (walletAddress) => {
                          const wallet = tonClient.openAt(lastBlock, Wallet.createFromAddress(walletAddress))
                          // Wallet may not exist or tonClient may throw an exception,
                          // so return previous this.walletState which is good for both cases.
                          const walletState = await wallet.getWalletState().catch(() => this.walletState)
                          return [walletAddress, wallet, walletState]
                      })

            const parallel: [
                Promise<TreasuryConfig>,
                Promise<bigint | undefined>,
                Promise<[Address, OpenedContract<Wallet>, typeof this.walletState] | undefined>,
            ] = [readTreasuryState, readTonBalance, readWallet]
            const [treasuryState, tonBalance, hton] = await Promise.all(parallel)
            let [walletAddress, wallet, walletState] = hton ?? []

            if (walletAddress == null && address != null && treasuryState.parent != null) {
                ;[walletAddress, wallet, walletState] = await tonClient
                    .openAt(lastBlock, Parent.createFromAddress(treasuryState.parent))
                    .getWalletAddress(address)
                    .then(async (walletAddress) => {
                        const wallet = tonClient.openAt(lastBlock, Wallet.createFromAddress(walletAddress))
                        const walletState = await wallet.getWalletState().catch(() => undefined)
                        return [walletAddress, wallet, walletState]
                    })
            }

            runInAction(() => {
                this.tonBalance = tonBalance
                this.treasury = treasury
                this.treasuryState = treasuryState
                this.walletAddress = walletAddress
                this.wallet = wallet
                this.walletState = walletState
                this.lastBlock = lastBlock
            })
        } catch {
            this.setErrorMessage(errorMessageTonAccess, retryDelay - 500)
            clearTimeout(this.timeoutReadLastBlock)
            this.timeoutReadLastBlock = setTimeout(() => void this.readLastBlock(), retryDelay)
        } finally {
            this.endRequest()
        }
    }

    send = () => {
        if (
            this.address != null &&
            this.isAmountValid &&
            this.isAmountPositive &&
            this.amountInNano != null &&
            this.treasury != null &&
            this.wallet != null &&
            this.tonConnectUI != null &&
            this.tonBalance != null
        ) {
            let referrer: Address | undefined
            try {
                referrer = Address.parse(referrerAddress)
            } catch {
                referrer = undefined
            }

            const message = this.isStakeTabActive
                ? createDepositMessage(this.treasury.address, this.amountInNano, referrer)
                : createUnstakeMessage(this.wallet.address, this.amountInNano)

            const tx: SendTransactionRequest = {
                validUntil: Math.floor(Date.now() / 1000) + txValidUntil,
                network: this.isMainnet ? CHAIN.MAINNET : CHAIN.TESTNET,
                from: this.address.toRawString(),
                messages: [message],
            }

            const tonBalance = this.tonBalance
            void this.tonConnectUI
                .sendTransaction(tx)
                .then(() => {
                    this.setWaitForTransaction('wait')
                    return this.checkIfBalanceChanged(tonBalance, 1)
                })
                .then(() => {
                    this.setAmount('')
                })
        }
    }

    checkIfBalanceChanged = async (tonBalance: bigint, counter: number): Promise<void> => {
        await sleep(checkBalanceChangeDelay)
        void this.readLastBlock()
        if (this.tonBalance !== tonBalance) {
            this.setWaitForTransaction('done')
            return Promise.resolve()
        }
        if (counter > 60) {
            this.setWaitForTransaction('timeout')
            return Promise.resolve()
        }
        return this.checkIfBalanceChanged(tonBalance, counter + 1)
    }

    initTonConnect = () => {
        if (document.getElementById(tonConnectButtonRootId) != null) {
            this.connectWallet()
        } else {
            setTimeout(this.initTonConnect, 10)
        }
    }

    connect = () => {
        if (this.tonConnectUI != null) {
            void this.tonConnectUI.openModal()
        }
    }

    connectWallet = () => {
        this.tonConnectUI = new TonConnectUI({
            manifestUrl: 'https://app.hipo.finance/tonconnect-manifest.json',
            buttonRootId: tonConnectButtonRootId,
        })
        this.tonConnectUI.onStatusChange((wallet) => {
            if (wallet != null) {
                const chain = wallet.account.chain
                if (
                    (chain === CHAIN.MAINNET && this.network === 'mainnet') ||
                    (chain === CHAIN.TESTNET && this.network === 'testnet')
                ) {
                    this.setAddress(Address.parseRaw(wallet.account.address))
                } else {
                    void this.tonConnectUI?.disconnect()
                    runInAction(() => {
                        this.setAddress(undefined)
                        this.setErrorMessage(
                            errorMessageNetworkMismatch + (this.isMainnet ? 'MainNet' : 'TestNet'),
                            10000,
                        )
                    })
                }
            } else {
                this.setAddress(undefined)
            }
        })
    }
}

function formatNano(amount: bigint | number): string {
    return (Number(amount) / 1000000000).toLocaleString(undefined, {
        maximumFractionDigits: 2,
    })
}

function formatPercent(amount: number): string {
    return amount.toLocaleString(undefined, {
        style: 'percent',
        maximumFractionDigits: 2,
    })
}

function formatDate(date: Date): string {
    return date.toLocaleString(navigator.language, {
        weekday: 'short',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
    })
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
}
