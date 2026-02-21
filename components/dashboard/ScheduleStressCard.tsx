"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, Plane, Clock } from "lucide-react"
import { ScheduleStress } from "@/lib/mockData"

interface ScheduleStressCardProps {
  schedule: ScheduleStress
}

export function ScheduleStressCard({ schedule }: ScheduleStressCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#FDB927]" />
          Schedule Stress Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            {schedule.backToBack ? (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-sm font-medium">Back-to-Back</div>
                  <Badge variant="warning" className="mt-1">Active</Badge>
                </div>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-sm font-medium">Back-to-Back</div>
                  <Badge variant="success" className="mt-1">None</Badge>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {schedule.threeInFour ? (
              <>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-sm font-medium">3 in 4 Nights</div>
                  <Badge variant="danger" className="mt-1">Active</Badge>
                </div>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-sm font-medium">3 in 4 Nights</div>
                  <Badge variant="success" className="mt-1">None</Badge>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Plane className="h-5 w-5 text-[#552583]" />
          <div className="flex-1">
            <div className="text-sm font-medium">Road Trip Length</div>
            <div className="text-lg font-semibold">{schedule.roadTripLength} games</div>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Clock className="h-5 w-5 text-[#552583]" />
          <div className="flex-1">
            <div className="text-sm font-medium">Rest Days</div>
            <div className="text-lg font-semibold">{schedule.restDays} day{schedule.restDays !== 1 ? "s" : ""}</div>
          </div>
        </div>
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Schedule Multiplier</span>
            <span className="text-2xl font-bold text-[#FDB927]">{schedule.scheduleMultiplier.toFixed(2)}x</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            This multiplier affects overall risk calculations
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
