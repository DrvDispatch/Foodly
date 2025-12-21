'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const sexOptions = [
    { id: 'male', label: 'Male', emoji: '👨' },
    { id: 'female', label: 'Female', emoji: '👩' },
]

export default function BodyBasicsPage() {
    const router = useRouter()
    const [sex, setSex] = useState<string>('')
    const [age, setAge] = useState<string>('')
    const [heightFeet, setHeightFeet] = useState<string>('')
    const [heightInches, setHeightInches] = useState<string>('')
    const [heightCm, setHeightCm] = useState<string>('')
    const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric')

    const isValid = sex && age && (unitSystem === 'metric' ? heightCm : (heightFeet && heightInches))

    const handleContinue = () => {
        if (!isValid) return

        // Calculate height in cm
        let finalHeightCm: number
        if (unitSystem === 'imperial') {
            finalHeightCm = (parseInt(heightFeet) * 12 + parseInt(heightInches)) * 2.54
        } else {
            finalHeightCm = parseFloat(heightCm)
        }

        // Store in sessionStorage
        sessionStorage.setItem('onboarding_sex', sex)
        sessionStorage.setItem('onboarding_age', age)
        sessionStorage.setItem('onboarding_height', finalHeightCm.toString())
        sessionStorage.setItem('onboarding_units', unitSystem)

        router.push('/onboarding/weight')
    }

    return (
        <div className="w-full max-w-md space-y-8 animate-fade-in">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((step) => (
                    <div
                        key={step}
                        className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            step <= 2 ? "w-8 bg-primary-500" : "w-2 bg-surface-200"
                        )}
                    />
                ))}
            </div>

            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 mb-2">
                    <User className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-surface-900">Your basics</h1>
                <p className="text-surface-500">Used to calculate your daily energy needs</p>
            </div>

            {/* Form */}
            <div className="space-y-6">
                {/* Sex Selection */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-surface-700">Biological sex</label>
                    <div className="grid grid-cols-2 gap-3">
                        {sexOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setSex(option.id)}
                                className={cn(
                                    "p-4 rounded-xl border-2 text-center transition-all duration-200",
                                    sex === option.id
                                        ? "border-primary-500 bg-primary-50"
                                        : "border-surface-200 bg-white hover:border-surface-300"
                                )}
                            >
                                <span className="text-2xl block mb-1">{option.emoji}</span>
                                <span className="text-sm font-medium text-surface-700">{option.label}</span>
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-surface-400">Used for BMR calculation accuracy</p>
                </div>

                {/* Age */}
                <div className="space-y-2">
                    <label htmlFor="age" className="text-sm font-medium text-surface-700">
                        Age
                    </label>
                    <input
                        id="age"
                        type="number"
                        min="16"
                        max="100"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="input text-center text-lg"
                        placeholder="30"
                    />
                </div>

                {/* Unit System Toggle */}
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setUnitSystem('metric')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            unitSystem === 'metric'
                                ? "bg-primary-500 text-white"
                                : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                        )}
                    >
                        Metric (cm/kg)
                    </button>
                    <button
                        onClick={() => setUnitSystem('imperial')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            unitSystem === 'imperial'
                                ? "bg-primary-500 text-white"
                                : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                        )}
                    >
                        Imperial (ft/lb)
                    </button>
                </div>

                {/* Height */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-700">Height</label>
                    {unitSystem === 'metric' ? (
                        <div className="relative">
                            <input
                                type="number"
                                min="100"
                                max="250"
                                value={heightCm}
                                onChange={(e) => setHeightCm(e.target.value)}
                                className="input text-center text-lg pr-12"
                                placeholder="175"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400">cm</span>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    min="4"
                                    max="8"
                                    value={heightFeet}
                                    onChange={(e) => setHeightFeet(e.target.value)}
                                    className="input text-center text-lg pr-10"
                                    placeholder="5"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400">ft</span>
                            </div>
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    min="0"
                                    max="11"
                                    value={heightInches}
                                    onChange={(e) => setHeightInches(e.target.value)}
                                    className="input text-center text-lg pr-10"
                                    placeholder="10"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400">in</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={() => router.back()}
                    className="btn-secondary flex-shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={handleContinue}
                    disabled={!isValid}
                    className={cn(
                        "btn-primary flex-1",
                        !isValid && "opacity-50 cursor-not-allowed"
                    )}
                >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                </button>
            </div>
        </div>
    )
}
