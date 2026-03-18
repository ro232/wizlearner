'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Zap, Flame, Trophy } from 'lucide-react';
import { UPPERCASE_LETTERS } from '@/lib/constants';

// Mock data
const stats = [
  { label: 'Practice Sessions', value: '47', icon: BookOpen, gradient: 'from-blue-500 to-blue-600' },
  { label: 'Letters Mastered', value: '12/26', icon: Trophy, gradient: 'from-green-500 to-green-600' },
  { label: 'Current Streak', value: '5', icon: Flame, gradient: 'from-orange-500 to-orange-600', suffix: 'days' },
  { label: 'Worksheets Saved', value: '8', icon: Zap, gradient: 'from-purple-500 to-purple-600' },
];

const letterStatuses = {
  mastered: UPPERCASE_LETTERS.slice(0, 5),      // A-E
  inProgress: UPPERCASE_LETTERS.slice(5, 12),   // F-L
};

const achievements = [
  { name: 'First Worksheet', emoji: '📝', earned: true, id: 1 },
  { name: 'Alphabet Explorer', emoji: '🔤', earned: true, id: 2 },
  { name: '5-Day Streak', emoji: '🔥', earned: true, id: 3 },
  { name: 'Number Ninja', emoji: '🔢', earned: false, id: 4 },
  { name: 'Shape Shifter', emoji: '🔶', earned: false, id: 5 },
  { name: '7-Day Streak', emoji: '⚡', earned: false, id: 6 },
  { name: 'Alphabet Master', emoji: '🏆', earned: false, id: 7 },
  { name: 'Community Star', emoji: '⭐', earned: false, id: 8 },
];

const weeklyActivityData = [
  { week: 'W1', sessions: 3, height: '30%' },
  { week: 'W2', sessions: 5, height: '50%' },
  { week: 'W3', sessions: 4, height: '40%' },
  { week: 'W4', sessions: 7, height: '70%' },
  { week: 'W5', sessions: 6, height: '60%' },
  { week: 'W6', sessions: 8, height: '80%' },
  { week: 'W7', sessions: 5, height: '50%' },
  { week: 'W8', sessions: 9, height: '90%' },
];

const getLetterStatus = (letter: string): 'mastered' | 'inProgress' | 'notStarted' => {
  if (letterStatuses.mastered.includes(letter)) return 'mastered';
  if (letterStatuses.inProgress.includes(letter)) return 'inProgress';
  return 'notStarted';
};

const getLetterColor = (status: 'mastered' | 'inProgress' | 'notStarted'): string => {
  if (status === 'mastered') return 'bg-gradient-to-br from-green-400 to-green-600';
  if (status === 'inProgress') return 'bg-gradient-to-br from-yellow-300 to-yellow-500';
  return 'bg-gray-300';
};

const getLetterTextColor = (status: 'mastered' | 'inProgress' | 'notStarted'): string => {
  if (status === 'mastered') return 'text-white';
  if (status === 'inProgress') return 'text-gray-900';
  return 'text-gray-600';
};

const masteredCount = letterStatuses.mastered.length;
const inProgressCount = letterStatuses.inProgress.length;
const totalLetters = UPPERCASE_LETTERS.length;
const progressPercent = Math.round((masteredCount / totalLetters) * 100);

export default function DashboardPage() {
  const [hoveredLetter, setHoveredLetter] = useState<string | null>(null);
  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-12 animate-fade-up">
          <h1 className="text-4xl font-extrabold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-2">Track learning progress and achievements</p>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-fade-up" style={{ animationDelay: '100ms' }}>
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="hover-lift border-0 overflow-hidden transition-all duration-300 hover:shadow-lg">
                <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.gradient} bg-opacity-10`}>
                      <Icon className={`w-6 h-6 text-${stat.gradient.split('-')[1]}-600`} style={{ color: stat.gradient.split(' ')[1] }} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                    {stat.suffix && <span className="text-sm text-slate-500">{stat.suffix}</span>}
                  </div>
                  <p className="text-sm text-slate-500 mt-2">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Alphabet Progress Section */}
        <Card className="mb-12 border-0 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle>Alphabet Progress</CardTitle>
            <CardDescription>Track mastery of each letter</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">{progressPercent}% Complete</span>
                <span className="text-xs text-slate-500">{masteredCount} of {totalLetters} letters</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Letter Grid */}
            <div className="grid grid-cols-13 gap-2 mb-8">
              {UPPERCASE_LETTERS.map((letter) => {
                const status = getLetterStatus(letter);
                const color = getLetterColor(status);
                const textColor = getLetterTextColor(status);
                return (
                  <div key={letter} className="relative group">
                    <button
                      className={`w-full aspect-square rounded-lg ${color} flex items-center justify-center font-bold text-lg transition-all duration-200 hover:scale-105 cursor-pointer shadow-sm`}
                      onMouseEnter={() => setHoveredLetter(letter)}
                      onMouseLeave={() => setHoveredLetter(null)}
                    >
                      <span className={`${textColor}`}>{letter}</span>
                    </button>

                    {/* Tooltip */}
                    {hoveredLetter === letter && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap z-10 pointer-events-none">
                        {status === 'mastered' && '✓ Mastered'}
                        {status === 'inProgress' && '⚡ In Progress'}
                        {status === 'notStarted' && '○ Not Started'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-green-400 to-green-600" />
                <span className="text-sm text-slate-600">Mastered ({masteredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-yellow-300 to-yellow-500" />
                <span className="text-sm text-slate-600">In Progress ({inProgressCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-300" />
                <span className="text-sm text-slate-600">Not Started ({totalLetters - masteredCount - inProgressCount})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements Section */}
        <div className="mb-12 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Achievements</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {achievements.map((achievement) => (
              <Card
                key={achievement.id}
                className={`border-2 transition-all duration-300 hover-lift ${
                  achievement.earned
                    ? 'border-orange-400 bg-white'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">{achievement.emoji}</div>
                  <h3 className={`font-semibold text-sm mb-2 ${achievement.earned ? 'text-slate-900' : 'text-slate-600'}`}>
                    {achievement.name}
                  </h3>
                  {achievement.earned && (
                    <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300 mx-auto">
                      Earned
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Weekly Activity Chart */}
        <Card className="border-0 animate-fade-up" style={{ animationDelay: '400ms' }}>
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>Practice sessions over the last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-3 h-48">
              {weeklyActivityData.map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-300 hover:from-blue-600 hover:to-blue-500 hover:shadow-lg cursor-pointer"
                    style={{ height: data.height }}
                  />
                  <span className="text-xs font-medium text-slate-600">{data.week}</span>
                  <span className="text-xs text-slate-500 hidden sm:inline">{data.sessions}s</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
